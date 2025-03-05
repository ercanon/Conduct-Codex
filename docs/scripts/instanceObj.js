/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    isHost = !(new URLSearchParams(window.location.search).get("data"));

    if (!isHost)
        return document.body.querySelector("header > buttons").forEach((btn) =>
            btn.remove());

    new InstanceHandler(document.body.querySelector("main"));

    document.getElementById("toggleMode").addEventListener("click", (event) => {
        switch (event.target.innerText) {
            case "Add Mode":
                event.target.innerText = "Edit Mode";
                event.target.setAttribute("data-mode", "edit");

                Array.from(document.getElementsByClassName("selectorStructBtn")).forEach((el) =>
                    el.classList.remove("hide"));
                Array.from(document.getElementsByClassName("addStructBtn")).forEach((el) =>
                    el.classList.add("hide"));
                break;
            case "Edit Mode":
                event.target.innerText = "Preview Mode";
                event.target.setAttribute("data-mode", "preview");

                Array.from(document.getElementsByClassName("selectorStructBtn")).forEach((el) =>
                    el.classList.add("hide"));
                break;
            case "Preview Mode":
                event.target.innerText = "Add Mode";
                event.target.setAttribute("data-mode", "add");

                Array.from(document.getElementsByClassName("addStructBtn")).forEach((el) =>
                    el.classList.remove("hide"));
                break;
        }
    });
    document.getElementById("dataUpload").addEventListener("click", () => {

    });
    document.getElementById("dataDownload").addEventListener("click", () => {

    });
});

class InstanceHandler {
    static #struc = [
        `<button class="addStructBtn"></button>`,
        `<section class="dynStruct">
            <input type="text" class="section-title" placeholder = "Title">
            <input type="text" class="section-usage" placeholder = "Usage">
         </section>`,
        `<article class="dynStruct">
            <input type="text" class="article-type" placeholder = "Entry Type">
         </article>`,
        `<div class="dynStruct">
            <iconify-icon icon="material-symbols:add-2-rounded" width="unset" height="unset"></iconify-icon>
            <input type="text" class="div-title" placeholder = "Title">
            <input type="text" class="div-sub" placeholder = "Subtitle">
         </div>`
    ];
    static #parserDOM = document.createRange()
    static #selectedStruc = null;
    constructor(parent, lvlPrev = -1) {
        if (++lvlPrev >= InstanceHandler.#struc.length)
            return console.warn("Structure Array has reached its limit");

        const newDOM = InstanceHandler.#parserDOM.createContextualFragment(InstanceHandler.#struc[lvlPrev]);
        const lvlNextDiv = newDOM.querySelector(".dynStruct");
        if (lvlNextDiv) {
            if (lvlNextDiv.localName === "section")
                InstanceHandler.changeColor(lvlNextDiv, "black");

            lvlNextDiv.insertAdjacentHTML("afterbegin", `<button class="selectorStructBtn hide"></button>`);
            newDOM.querySelector(".selectorStructBtn")?.addEventListener("click", this.selectStruct = (event) => {
                InstanceHandler.#selectedStruc?.classList.remove("selected");

                if (InstanceHandler.#selectedStruc === event.target)
                    return InstanceHandler.#selectedStruc = null;
                
                InstanceHandler.#selectedStruc = event.target;
                event.target.classList.add("selected");
            });
        }

        if (lvlPrev < InstanceHandler.#struc.length - 1) {
            lvlNextDiv?.insertAdjacentHTML("beforeend", InstanceHandler.#struc[0]);
            newDOM.querySelector(".addStructBtn")?.addEventListener("click", this.createStruct = () =>
                new InstanceHandler(lvlNextDiv || parent, lvlPrev));
        }

        parent.insertBefore(newDOM, parent.lastChild);
    }
    static changeColor(element, color) {
        (element.localName === "section" ?
            element :
            element.closest("section"))
        .style.setProperty("--sectionColor", color);
    }
    delete() { //TODO
        parent.querySelectorAll(".addStructBtn")?.forEach((btn) =>
            btn.removeEventListener("click", this.createStruct));
        parent.querySelectorAll(".selectorStructBtn")?.forEach((btn) =>
            btn.removeEventListener("click", this.selectStruct));
    }
}