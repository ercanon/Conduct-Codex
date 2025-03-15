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
    HoverHandler.prepareHover(main, document.getElementById("indStruct"));
    StructureHandler.createStruct(main);

    const delStruct = document.getElementById("deleteStruct");
    HoverHandler.prepareHover(delStruct);

    StructureHandler.dropdownIcon = document.getElementById("dropdownIcon");
    StructureHandler.preparePopup(document.getElementById("popupInfo"));

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
        HoverHandler.resetIndicate(false);
        for (const elem of [delStruct, currentTarget])
            elem.setAttribute("data-mode", currentTarget.innerText.split(" ")[0]);

        //Change Mode Elements
        for (const struct of document.getElementsByClassName("dynStruct"))
            struct.draggable = btnState;
        for (const button of document.getElementsByClassName("addStructBtn"))
            button.classList.toggle("hide", btnState);
    });

    /*>---------- [ Initialize Data Handler ] ----------<*/
    document.getElementById("dataUpload").addEventListener("click", () => {
    });
    document.getElementById("dataDownload").addEventListener("click", () => {
    });
});

class StructureHandler {
    static dropdownIcon = null;
    static #popupInfo = null;
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
            <input type="text" class="entry-title" placeholder = "Title">
            <input type="text" class="entry-sub" placeholder = "Subtitle">
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
                    dynStruct.addEventListener("dblclick", StructureHandler.#openPopup);
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

    static preparePopup(target) {
        target.addEventListener("click", (event) => {
            if (event.target === target)
                target.classList.add("hide");
        }); //TODO

        const textEdit = target.firstElementChild;
        const textResult = target.querySelector("section > span");
        textEdit.addEventListener("input", (event) =>
            textResult.innerHTML = marked.parse(event.currentTarget.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")));
        textEdit.addEventListener("change", (event) =>
            console.log("Sending Data"));

        StructureHandler.#popupInfo = target.lastElementChild;
    }
    static #openPopup(event) {
        const { currentTarget } = event;
        if (!currentTarget.draggable) {
            const [entryTitle, sectionTitle] = StructureHandler.#popupInfo.children;
            const section = currentTarget.closest("section.dynStruct");
            const colorVar = "--sectionColor";

            const getTitleMatch = (attribute, target) =>
                attribute.innerText = target.querySelector(`.${attribute.getAttribute("data-title")}`)?.value || "";

            StructureHandler.#popupInfo.style.setProperty(colorVar, section.style.getPropertyValue(colorVar));
            getTitleMatch(sectionTitle, section);
            getTitleMatch(entryTitle, currentTarget);

            StructureHandler.#popupInfo.parentNode.classList.remove("hide");
        }
    }
}

class HoverHandler {
    static #indStruct = null;
    static #selectedStruct = null;

    static prepareHover(target, indicator) {
        if (indicator) {
            HoverHandler.#indStruct = indicator;
            target.addEventListener("mousemove", HoverHandler.#hoverStruct);
            target.addEventListener("dragstart", HoverHandler.#dragStart);
            target.addEventListener("dragend", HoverHandler.#dragDrop);
        }
        target.addEventListener("dragover", HoverHandler.#dragOver);
    }
    static resetIndicate(dragging) {
        Object.assign(HoverHandler.#indStruct.style, {
            transform: "",
            width: "",
            height: "",
            transition: "none"
        });

        HoverHandler.#selectedStruct = null;
        HoverHandler.#indStruct.classList.toggle("dragStruct", dragging);
    }

    static #hoverStruct(event) {
        event.stopPropagation();
        if (HoverHandler.#selectedStruct || !event.target.draggable)
            return;

        const rect = event.target.getBoundingClientRect();
        const styleValues = event.target === HoverHandler.#selectedStruct
            ? { width: "0", height: "0", transition: "none" }
            : { width: `${rect.width}px`, height: `${rect.height}px`, transition: "" };

        Object.assign(HoverHandler.#indStruct.style, {
            transform: `translate(${rect.left}px, ${rect.top}px)`,
            ...styleValues
        });
    }

    static #dragStart(event) {
        event.stopPropagation();

        const { target } = event;
        if (!target.draggable)
            return;

        HoverHandler.resetIndicate(true);
        HoverHandler.#selectedStruct = {
            selectedName: target.localName,
            parentName: target.parentNode.localName
        };

        requestAnimationFrame(() => {
            target.classList.add("hide");
            target.parentNode.insertBefore(HoverHandler.#indStruct, target);
        });
    }
    static #dragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        const { target } = event;
        if (target.id === "deleteStruct")
            return target.appendChild(HoverHandler.#indStruct);
        else if (!target.draggable)
            return;

        const { selectedName, parentName } = HoverHandler.#selectedStruct;
        if (selectedName === target.localName) {
            const rect = target.getBoundingClientRect();
            const isLeftOrTop = selectedName === "div"
                ? event.clientX < rect.left + rect.width / 2
                : event.clientY < rect.top + rect.height / 2;

            target.parentNode.insertBefore(
                HoverHandler.#indStruct,
                isLeftOrTop ? target : target.nextSibling
            );
        }
        else if (parentName === target.localName)
            target.insertBefore(
                HoverHandler.#indStruct,
                target.lastElementChild
            );
    }
    static #dragDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        const { target } = event;
        if (!target.draggable)
            return;

        if (HoverHandler.#indStruct.parentNode.id === "deleteStruct")
            target.remove();
        else 
            HoverHandler.#indStruct.replaceWith(target);

        document.body.appendChild(HoverHandler.#indStruct);
        target.classList.remove("hide");
        HoverHandler.resetIndicate(false);
    }
}