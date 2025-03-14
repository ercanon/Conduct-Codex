/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener("DOMContentLoaded", async () => {
    isHost = !(new URLSearchParams(window.location.search).get("data"));

    if (!isHost) {
        for (const id of ["toggleMode", "dataUpload", "dropdownIcon", "#indStruct"])
            document.getElementById(id).remove()
        return;
    }

    /*>---------- [ initialize Components ] ----------<*/
    const main = document.body.querySelector("main");
    HoverHandeler.prepareHover(main, document.getElementById("indStruct"));
    StructureHandler.createStruct(main);

    const delStruct = document.getElementById("deleteStruct");
    HoverHandeler.prepareHover(delStruct);

    StructureHandler.popupInfo = document.getElementById("popupInfo");
    StructureHandler.popupInfo.addEventListener("click", (event) => {
        if (event.target === StructureHandler.popupInfo)
            StructureHandler.popupInfo.classList.add("hide")
    }); //TODO

    const textEdit = StructureHandler.popupInfo.firstElementChild;
    const textResult = StructureHandler.popupInfo.lastElementChild;
    textEdit.addEventListener("input", (event) =>
        textResult.innerHTML = marked.parse(event.currentTarget.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")));
    textEdit.addEventListener("change", (event) =>
        console.log("Sending Data"));

    StructureHandler.dropdownIcon = document.getElementById("dropdownIcon");

    /*>---------- [ Initizalize dropdown ] ----------<*/
    const dropdownList = StructureHandler.dropdownIcon.lastElementChild;
    fetch("https://cdn.jsdelivr.net/npm/@iconify-json/game-icons/icons.json")
        .then((response) =>
            response.json())
        .then((data) => {
            Object.keys(data.icons).forEach(async (name) => {
                const iconName = `${data.prefix}:${name}`;

                const figure = document.createElement("figure");
                const icon = document.createElement("iconify-icon");
                Object.assign(icon, {
                    icon: iconName,
                    width: "unset",
                    height: "unset"
                });
                figure.appendChild(icon);

                const nameFig = document.createElement("p");
                nameFig.innerText = name;
                figure.appendChild(nameFig);

                figure.addEventListener("click", () => {
                    StructureHandler.dropdownIcon.client?.setAttribute("icon", iconName);
                    StructureHandler.dropdownClear();
                });

                dropdownList.appendChild(figure);
        });

            StructureHandler.dropdownIcon.addEventListener("mouseleave", StructureHandler.dropdownClear);
            StructureHandler.dropdownIcon.firstElementChild.addEventListener("input", (event) => {
                const textInput = event.currentTarget.value.toLowerCase();
                [...dropdownList.children].forEach(async (icon) =>
                    icon.classList.toggle("hide", !icon.lastElementChild.textContent.toLowerCase().includes(textInput)));
            });
        })
        .catch((error) =>
            console.error("Error loading icons", error));

    /*>---------- [ initialize Mode Change ] ----------<*/
    const btnMode = document.getElementById("toggleMode")
    btnMode.addEventListener("click", (event) => {
        //Determine Mode
        const { currentTarget } = event;
        const btnState = currentTarget.innerText === "Edit Mode";
        currentTarget.innerText = btnState ? "Reorder Mode" : "Edit Mode";

        //Clear utils
        StructureHandler.dropdownClear()
        HoverHandeler.resetIndicate(false);
        for (const elem of [delStruct, currentTarget])
            elem.setAttribute("data-mode", currentTarget.innerText.split(" ")[0]);

        //Change Mode Elements
        for (const struct of document.getElementsByClassName("dynStruct"))
            struct.draggable = btnState;
        for (const button of document.getElementsByClassName("addStructBtn"))
            button.classList.toggle("hide", btnState);
    });

    /*>---------- [ Initialize Data Handeler ] ----------<*/
    document.getElementById("dataUpload").addEventListener("click", () => {
    });
    document.getElementById("dataDownload").addEventListener("click", () => {
    });
});

class StructureHandler {
    static dropdownIcon = null;
    static popupInfo = null;
    static #structArray = [
        `<button class="addStructBtn"></button>`,
        `<section class="dynStruct" draggable="false">
            <input type="color" class="section-color">
            <input type="text" class="section-title" placeholder = "Title">
            <input type="text" class="section-usage" placeholder = "Usage" >
         </section>`,
        `<article class="dynStruct" draggable="false">
            <input type="text" class="article-type" placeholder = "Entry Type">
         </article>`,
        `<div class="dynStruct" draggable="false">
            <iconify-icon icon="material-symbols:add-2-rounded" width="unset" height="unset" noobserver></iconify-icon>
            <input type="text" class="div-title" placeholder = "Title">
            <input type="text" class="div-sub" placeholder = "Subtitle">
         </div>`
    ];
    static #parserDOM = document.createRange();

    static createStruct(event) {
        /*>---------- [ Initialitation ] ----------<*/
        const parent = event.target?.parentNode || event;
        let lvlPrev = StructureHandler.#structArray.findIndex((struct) =>
            struct.substring(0, 10).includes(parent.localName === "main"
                ? event.target?.localName
                : parent.localName));

        if (++lvlPrev >= StructureHandler.#structArray.length)
            return console.warn("Structure Array has reached its limit");
        const newDOM = StructureHandler.#parserDOM.createContextualFragment(StructureHandler.#structArray[lvlPrev]);

        /*>---------- [ Set Struct ] ----------<*/
        const dynStruct = newDOM.querySelector(".dynStruct");
        if (dynStruct) {
            if (lvlPrev < StructureHandler.#structArray.length - 1)
                dynStruct.insertAdjacentHTML("beforeend", StructureHandler.#structArray[0]);

            const fistChild = dynStruct.firstElementChild;
            switch (dynStruct.localName) {
                case "section":
                    fistChild.addEventListener("input", StructureHandler.#changeColor);
                    //fistChild.addEventListener("change", (event) => { });
                    fistChild.dispatchEvent(new Event("input"));
                    break;
                case "div":
                    dynStruct.addEventListener("dblclick", StructureHandler.#popUp);
                    fistChild.addEventListener("click", StructureHandler.#dropdownCall);
                    break;
            }
        }

        /*>---------- [ Add Button Action ] ----------<*/
        newDOM.querySelector(".addStructBtn")?.addEventListener("click", StructureHandler.createStruct);

        /*>---------- [ Insert into HTML ] ----------<*/
        parent.insertBefore(newDOM, parent.lastElementChild);
    }

    static #changeColor(event) {
        event.currentTarget.parentNode.style.setProperty("--sectionColor", event.currentTarget.value);
    }

    static #dropdownCall(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        StructureHandler.dropdownIcon.style.transform = `translateY(${rect.bottom}px)`;

        const active = StructureHandler.dropdownIcon.client === event.currentTarget
        StructureHandler.dropdownIcon.classList.toggle("hide", active)
        if (active)
            StructureHandler.dropdownIcon.client = null;
        else
            StructureHandler.dropdownIcon.client = event.currentTarget;
    }
    static dropdownClear() {
        StructureHandler.dropdownIcon.client = null;
        StructureHandler.dropdownIcon.classList.add("hide");
    }

    static #popUp(event) {
        if (!event.currentTarget.draggable)
            StructureHandler.popupInfo.classList.remove("hide")
    }
}

class HoverHandeler {
    static #indStruct = null;
    static #selectedStruct = null;

    static prepareHover(target, indicator) {
        if (indicator) {
            HoverHandeler.#indStruct = indicator;
            target.addEventListener("mousemove", HoverHandeler.#hoverStruct);
            target.addEventListener("dragstart", HoverHandeler.#dragStart);
            target.addEventListener("dragend", HoverHandeler.#dragDrop);
        }
        target.addEventListener("dragover", HoverHandeler.#dragOver);
    }
    static resetIndicate(dragging) {
        Object.assign(HoverHandeler.#indStruct.style, {
            transform: "",
            width: "",
            height: "",
            transition: "none"
        });

        HoverHandeler.#selectedStruct = null;
        HoverHandeler.#indStruct.classList.toggle("dragStruct", dragging);
    }

    static #hoverStruct(event) {
        event.stopPropagation();
        if (HoverHandeler.#selectedStruct || !event.target.draggable)
            return;

        const rect = event.target.getBoundingClientRect();
        const styleValues = event.target === HoverHandeler.#selectedStruct
            ? { width: "0", height: "0", transition: "none" }
            : { width: `${rect.width}px`, height: `${rect.height}px`, transition: "" };

        Object.assign(HoverHandeler.#indStruct.style, {
            transform: `translate(${rect.left}px, ${rect.top}px)`,
            ...styleValues
        });
    }

    static #dragStart(event) {
        event.stopPropagation();

        const { target } = event;
        if (!target.draggable)
            return;

        HoverHandeler.resetIndicate(true);
        HoverHandeler.#selectedStruct = {
            selectedName: target.localName,
            parentName: target.parentNode.localName
        };

        requestAnimationFrame(() => {
            target.classList.add("hide");
            target.parentNode.insertBefore(HoverHandeler.#indStruct, target);
        });
    }
    static #dragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        const { target } = event;
        if (target.id === "deleteStruct")
            return target.appendChild(HoverHandeler.#indStruct);
        else if (!target.draggable)
            return;

        const { selectedName, parentName } = HoverHandeler.#selectedStruct;
        if (selectedName === target.localName) {
            const rect = target.getBoundingClientRect();
            const isLeftOrTop = selectedName === "div"
                ? event.clientX < rect.left + rect.width / 2
                : event.clientY < rect.top + rect.height / 2;

            target.parentNode.insertBefore(
                HoverHandeler.#indStruct,
                isLeftOrTop ? target : target.nextSibling
            );
        }
        else if (parentName === target.localName)
            target.insertBefore(
                HoverHandeler.#indStruct,
                target.lastElementChild
            );
    }
    static #dragDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        const { target } = event;
        if (!target.draggable)
            return;

        if (HoverHandeler.#indStruct.parentNode.id === "deleteStruct")
            target.remove();
        else 
            HoverHandeler.#indStruct.replaceWith(target);

        document.body.appendChild(HoverHandeler.#indStruct);
        target.classList.remove("hide");
        HoverHandeler.resetIndicate(false);
    }
}