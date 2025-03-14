/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    isHost = !(new URLSearchParams(window.location.search).get("data"));

    if (!isHost) {
        for (const id of ["toggleMode", "dataUpload", "dropdownIcon", "indStruct"])
            document.getElementById(id).remove()
        return;
    }

    /*>---------- [ initialize Components ] ----------<*/
    HoverHandeler.indStruct = document.getElementById("indStruct");
    StructureHandler.createStruct(document.body.querySelector("main"));

    const delStruct = document.getElementById("deleteStruct");
    delStruct.addEventListener("dragover", HoverHandeler.dragOver);

    StructureHandler.dropdownIcon = document.getElementById("dropdownIcon");
    StructureHandler.popupInfo = document.getElementById("popupInfo");
    const textEdit = StructureHandler.popupInfo.firstElementChild
    const textResult = StructureHandler.popupInfo.lastElementChild
    StructureHandler.popupInfo.addEventListener("click", (event) => {
        if (event.target === StructureHandler.popupInfo)
            StructureHandler.popupInfo.classList.add("hide")
    });
    textEdit.addEventListener("input", (event) =>
        textResult.innerHTML = marked.parse(event.currentTarget.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")));
    textEdit.addEventListener("change", (event) =>
        console.log("Sending Data"));

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
                    StructureHandler.dropdownIcon.client = null;
                    dropdownIcon.classList.add("hide");
                });

                dropdownList.appendChild(figure);
        });

            StructureHandler.dropdownIcon.firstElementChild.addEventListener("input", (event) => {
                const textInput = event.currentTarget.value.toLowerCase();
                [...dropdownList.children].forEach(async (icon) =>
                    icon.classList.toggle("hide", !icon.lastElementChild.textContent.toLowerCase().includes(textInput)));
            });
            StructureHandler.dropdownIcon.addEventListener("mouseleave", () => {
                StructureHandler.dropdownIcon.client = null;
                dropdownIcon.classList.add("hide");
            });
        })
        .catch((error) =>
            console.error("Error loading icons", error));

    /*>---------- [ initialize Mode Change ] ----------<*/
    const btnMode = document.getElementById("toggleMode")
    btnMode.addEventListener("click", (event) => {
        //Determine Mode
        const button = event.target;
        const btnState = button.innerText === "Edit Mode";

        button.innerText = btnState ? "Reorder Mode" : "Edit Mode";
        button.setAttribute("data-mode", button.innerText.split(" ")[0]);

        //Clear utils
        StructureHandler.dropdownIcon.client = null;
        StructureHandler.dropdownIcon.classList.add("hide")
        HoverHandeler.resetIndicate(false);
        delStruct.style.bottom = btnState ? "" : "-10vh";

        //Change Mode Elements
        for (const struct of document.getElementsByClassName("dynStruct")) {
            struct.draggable = btnState;
            HoverHandeler.prepareHover(struct, btnState);
        }
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

        StructureHandler.dropdownIcon.client = event.currentTarget;
        StructureHandler.dropdownIcon.classList.remove("hide")
    }

    static #popUp(event) {
        StructureHandler.popupInfo.classList.remove("hide")
    }
}

class HoverHandeler {
    static indStruct = null;
    static #selectedStruct = null;

    static prepareHover(target, active) {
        const action = active ? "addEventListener" : "removeEventListener";
        target[action]("mousemove", HoverHandeler.#hoverStruct);
        target[action]("dragstart", HoverHandeler.#dragStart);
        target[action]("dragover", HoverHandeler.dragOver);
        target[action]("dragend", HoverHandeler.#dragDrop);
    }
    static resetIndicate(dragging) {
        Object.assign(HoverHandeler.indStruct.style, {
            transform: "",
            width: "",
            height: "",
            transition: "none"
        });

        HoverHandeler.#selectedStruct = null;
        HoverHandeler.indStruct.classList.toggle("dragStruct", dragging);
    }

    static #hoverStruct(event) {
        if (HoverHandeler.#selectedStruct)
            return;
        event.stopPropagation();

        const rect = event.currentTarget.getBoundingClientRect();
        const styleValues = event.currentTarget === HoverHandeler.#selectedStruct
            ? { width: "0", height: "0", transition: "none" }
            : { width: `${rect.width}px`, height: `${rect.height}px`, transition: "" };

        Object.assign(HoverHandeler.indStruct.style, {
            transform: `translate(${rect.left}px, ${rect.top}px)`,
            ...styleValues
        });
    }

    static #dragStart(event) {
        event.stopPropagation();
        HoverHandeler.resetIndicate(true);
        HoverHandeler.#selectedStruct = {
            selectedName: event.currentTarget.localName,
            parentName: event.currentTarget.parentNode.localName
        };

        const target = event.target;
        requestAnimationFrame(() => {
            target.replaceWith(HoverHandeler.indStruct);
        });
    }
    static dragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        const { currentTarget, clientX, clientY } = event;
        const { selectedName, parentName } = HoverHandeler.#selectedStruct;
        if (event.currentTarget.draggable) {
            if (selectedName === currentTarget.localName) {
                const rect = currentTarget.getBoundingClientRect();
                const isLeftOrTop = selectedName === "div"
                    ? clientX < rect.left + rect.width / 2
                    : clientY < rect.top + rect.height / 2;

                currentTarget.parentNode.insertBefore(
                    HoverHandeler.indStruct,
                    isLeftOrTop ? currentTarget : currentTarget.nextSibling
                );
            }
            else if (parentName === currentTarget.localName)
                currentTarget.insertBefore(
                    HoverHandeler.indStruct,
                    currentTarget.lastElementChild
                );
        }
        else if (currentTarget.id === "deleteStruct")
            currentTarget.appendChild(HoverHandeler.indStruct);
    }
    static #dragDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        if (HoverHandeler.indStruct.parentNode.id === "deleteStruct")
            event.currentTarget.remove();
        else 
            HoverHandeler.indStruct.replaceWith(event.currentTarget);
        document.body.appendChild(HoverHandeler.indStruct);

        HoverHandeler.#selectedStruct.ogParentName = null;
        HoverHandeler.resetIndicate(false);
    }
}