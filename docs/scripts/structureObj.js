/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    isHost = !(new URLSearchParams(window.location.search).get("data"));

    if (!isHost)
        return document.body.querySelector("header > buttons").forEach((btn) =>
            btn.remove());

    StructureHandler.createStruct(document.body.querySelector("main"));

    document.getElementById("toggleMode").addEventListener("click", (event) => {
        switch (event.target.innerText) {
            case "Edit Mode":
                event.target.innerText = "Rearrange Mode";
                event.target.setAttribute("data-mode", "arrange");

                Array.from(document.getElementsByClassName("selectStructBtn")).forEach((el) => {
                    el.classList.remove("hide")
                    el.parentNode.draggable = true;
                });
                Array.from(document.getElementsByClassName("addStructBtn")).forEach((el) =>
                    el.classList.add("hide"));
                break;
            case "Rearrange Mode":
                event.target.innerText = "Preview Mode";
                event.target.setAttribute("data-mode", "preview");

                Array.from(document.getElementsByClassName("selectStructBtn")).forEach((el) => {
                    el.classList.add("hide")
                    el.parentNode.draggable = false;
                });
                break;
            case "Preview Mode":
                event.target.innerText = "Edit Mode";
                event.target.setAttribute("data-mode", "edit");

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

class StructureHandler {
    static #structArray = [
        `<button class="addStructBtn"></button>`,
        `<section class="dynStruct" draggable="false">
            <input type="text" class="section-title" placeholder = "Title">
            <input type="text" class="section-usage" placeholder = "Usage">
         </section>`,
        `<article class="dynStruct" draggable="false">
            <input type="text" class="article-type" placeholder = "Entry Type">
         </article>`,
        `<div class="dynStruct" draggable="false">
            <iconify-icon icon="material-symbols:add-2-rounded" width="unset" height="unset"></iconify-icon>
            <input type="text" class="div-title" placeholder = "Title">
            <input type="text" class="div-sub" placeholder = "Subtitle">
         </div>`
    ];
    static #parserDOM = document.createRange();

    static createStruct(event) {
        /*>---------- [ Initialitation ] ----------<*/
        const parent = event.target?.parentNode || event;
        let lvlPrev = StructureHandler.#structArray.findIndex((struct) =>
            struct.substring(0, 10).includes(parent.localName === "main" ?
                event.target?.localName :
                parent.localName));

        if (++lvlPrev >= StructureHandler.#structArray.length)
            return console.warn("Structure Array has reached its limit");
        const newDOM = StructureHandler.#parserDOM.createContextualFragment(StructureHandler.#structArray[lvlPrev]);

        /*>---------- [ Add Button Selector ] ----------<*/
        const dynStruct = newDOM.querySelector(".dynStruct");
        if (dynStruct) {
            if (lvlPrev < StructureHandler.#structArray.length - 1)
                dynStruct.insertAdjacentHTML("beforeend", StructureHandler.#structArray[0]);
            if (dynStruct.localName === "section")
                StructureHandler.#changeColor(dynStruct, "black");

            HoverHandeler.prepareHover(dynStruct);
        }

        /*>---------- [ Add Button Action ] ----------<*/
        newDOM.querySelector(".addStructBtn")?.addEventListener("click", StructureHandler.createStruct);

        /*>---------- [ Insert into HTML ] ----------<*/
        parent.insertBefore(newDOM, parent.lastChild);
    }
    static #changeColor(element, color) {
        element.closest("section").style.setProperty("--sectionColor", color);
    }
    static #delete(event) {
        const target = event.target.closest(".dynStruct");
        target.querySelectorAll(".addStructBtn")?.forEach((btn) =>
            btn.removeEventListener("click", this.createStruct));
        HoverHandeler.delete(target);
    }
}

class HoverHandeler {
    static #selectedStruc = null;
    static #targetElem = null;

    static prepareHover(target) {
        target.insertAdjacentHTML("afterbegin", `<button class="selectStructBtn hide"></button>`);
        const selectorBtn = target.querySelector(".selectStructBtn");
        if (selectorBtn) {
            selectorBtn.addEventListener("mousedown", HoverHandeler.#selectStruct);
            selectorBtn.addEventListener("dragover", HoverHandeler.#dragOver);
            selectorBtn.addEventListener("drop", HoverHandeler.#dragDrop);
        }
    }

    static #selectStruct(event) {
        HoverHandeler.#selectedStruc?.classList.remove("selectedStruct");

        if (HoverHandeler.#selectedStruc === event.target)
            return HoverHandeler.#selectedStruc = null;

        HoverHandeler.#selectedStruc = event.target;
        HoverHandeler.#selectedStruc.classList.add("selectedStruct");
    }

    static #dragOver(event) {
        const targetID = `${HoverHandeler.#selectedStruc.parentNode.parentNode.localName}.dynStruct`;
        HoverHandeler.#targetElem = event.target.closest(targetID) || event.target.querySelector(targetID);
        if (!HoverHandeler.#targetElem)
            return;
        event.preventDefault();
    }
    static #dragDrop(event) {
        event.preventDefault();
        const draggedElement = HoverHandeler.#selectedStruc.parentNode;

        if (!HoverHandeler.#targetElem || draggedElement === HoverHandeler.#targetElem)
            return;

        HoverHandeler.#targetElem.appendChild(draggedElement, HoverHandeler.#targetElem.nextSibling);
    }
    static delete(target) {
        target.querySelectorAll(".selectStructBtn")?.forEach((btn) => {
            btn.removeEventListener("mousedown", HoverHandeler.#selectStruct);
            btn.removeEventListener("dragover", HoverHandeler.#dragOver);
            btn.removeEventListener("drop", HoverHandeler.#dragDrop);
        });  
    }
}