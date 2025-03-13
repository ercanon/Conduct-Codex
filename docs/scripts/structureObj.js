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

    StructureHandler.dropdownIcon = document.getElementById("dropdownIcon");
    const dropdownList = StructureHandler.dropdownIcon.lastElementChild;

    /*>---------- [ Initizalize dropdown ] ----------<*/
    fetch("https://cdn.jsdelivr.net/npm/@iconify-json/game-icons/icons.json")
        .then((response) =>
            response.json())
        .then((data) => {
            Iconify.addCollection(data);
            Iconify.listIcons("", data.prefix).forEach((iconName) => {
                const figure = document.createElement("figure");
                figure.appendChild(Iconify.renderSVG(iconName, {
                    height: "unset"
                }));

                const nameFig = document.createElement("figcaption");
                nameFig.textContent = iconName.split(":")[1];
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
        const button = event.target;
        const btnState = button.innerText === "Edit Mode";

        button.innerText = btnState ? "Rearrange Mode" : "Edit Mode";
        button.setAttribute("data-mode", button.innerText.split(" ")[0]);

        HoverHandeler.selectStruct(null);
        HoverHandeler.resetIndicate(false);

        for (const struct of document.getElementsByClassName("dynStruct")) {
            struct.draggable = btnState;
            HoverHandeler.prepareHover(struct, btnState);
            for (const child of struct.children) {
                if (!child.classList.contains("dynStruct"))
                    child.style.pointerEvents = btnState ? "none" : "";
            }
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
    static #structArray = [
        `<button class="addStructBtn"></button>`,
        `<section class="dynStruct" draggable="false">
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

            if (dynStruct.localName === "section")
                StructureHandler.#changeColor(dynStruct, "black");
            else if (dynStruct.firstElementChild.localName === "iconify-icon")
                dynStruct.firstElementChild.addEventListener("click", StructureHandler.#dropdownCall);
        }

        /*>---------- [ Add Button Action ] ----------<*/
        newDOM.querySelector(".addStructBtn")?.addEventListener("click", StructureHandler.createStruct);

        /*>---------- [ Insert into HTML ] ----------<*/
        parent.insertBefore(newDOM, parent.lastElementChild);
    }

    static #changeColor(element, color) {
        element.closest("section.dynStruct").style.setProperty("--sectionColor", color);
    }
    static #delete(event) {
        const target = event.target.closest(".dynStruct");
        target.querySelectorAll(".addStructBtn")?.forEach((btn) =>
            btn.removeEventListener("click", StructureHandler.createStruct));
        target.querySelectorAll("iconify-icon")?.forEach((icon) =>
            icon.removeEventListener("click", StructureHandler.#dropdownCall));
        target.querySelectorAll(".dynStruct")?.forEach((struct) =>
            HoverHandeler.prepareHover(struct, false));
    }

    static #dropdownCall(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        StructureHandler.dropdownIcon.style.transform = `translateY(${rect.bottom}px)`;

        StructureHandler.dropdownIcon.client = event.currentTarget;
        StructureHandler.dropdownIcon.classList.remove("hide")
    }
}

class HoverHandeler {
    static indStruct = null;
    static #selectedStruct = null;

    static prepareHover(target, active) {
        const action = active ? "addEventListener" : "removeEventListener";
        target[action]("click", HoverHandeler.selectStruct);
        target[action]("mousemove", HoverHandeler.#hoverStruct);
        target[action]("dragstart", HoverHandeler.#dragStart);
        target[action]("dragover", HoverHandeler.#dragOver);
        target[action]("dragend", HoverHandeler.#dragDrop);
    }
    static resetIndicate(dragging) {
        const action = dragging ? "add" : "remove";
        Object.assign(HoverHandeler.indStruct.style, {
            transform: "",
            width: "",
            height: HoverHandeler.#selectedStruct?.localName === "section" ? "10px" : "5px",
            transition: "none"
        });
        HoverHandeler.indStruct.classList[action]("dragStruct");
    }

    static selectStruct(event, dragging) {
        event?.stopPropagation();
        HoverHandeler.#selectedStruct?.classList.remove("selectedStruct");

        if (!event || (!dragging && HoverHandeler.#selectedStruct === event.currentTarget))
            return HoverHandeler.#selectedStruct = null;

        HoverHandeler.#selectedStruct = event.currentTarget;
        HoverHandeler.#selectedStruct.classList.add("selectedStruct");
    }

    static #hoverStruct(event) {
        if (HoverHandeler.#selectedStruct?.ogParentName)
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

        HoverHandeler.selectStruct(event, true);
        HoverHandeler.resetIndicate(true);
        requestAnimationFrame(() => {
            HoverHandeler.#selectedStruct.ogParentName = HoverHandeler.#selectedStruct.parentNode.localName;
            HoverHandeler.#selectedStruct.replaceWith(HoverHandeler.indStruct);
        });
    }
    static #dragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        const { currentTarget, clientX, clientY } = event;
        const selectedName = HoverHandeler.#selectedStruct.localName;
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
        else if (HoverHandeler.#selectedStruct.ogParentName === currentTarget.localName)
            currentTarget.insertBefore(
                HoverHandeler.indStruct,
                currentTarget.lastElementChild
            );
    }
    static #dragDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        HoverHandeler.indStruct.replaceWith(HoverHandeler.#selectedStruct);
        document.body.appendChild(HoverHandeler.indStruct);

        HoverHandeler.#selectedStruct.ogParentName = null;
        HoverHandeler.resetIndicate(false);
    }
}