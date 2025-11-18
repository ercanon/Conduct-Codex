class StructureHandler {
    static #parserDOM = document.createRange();
    static #structArray = [
        `<button class="addStructBtn"></button>`,
        `<section class="dynStruct">
            <input type="color" class="section-color">
            <input type="text" class="section-title" placeholder="Title">
            <input type="text" class="section-usage" placeholder="Usage">
         </section>`,
        `<article class="dynStruct">
            <textarea class="article-type" placeholder="Entry Type" style="height: 21px"></textarea>
            <span class="article-type parsed-md" hidden></span>
         </article>`,
        `<div class="dynStruct">
            <iconify-icon icon="material-symbols:add-2-rounded" width="unset" height="unset" noobserver></iconify-icon>
            <input type="text" class="div-title" placeholder="Title">
            <input type="text" class="div-sub" placeholder="Subtitle">
         </div>`
    ];

    static createStruct(event) {
        document.isHost = !DataHandler.gistID;
        const { currentTarget, storeData } = event;

        const parent = currentTarget.localName === "button"
            ? currentTarget.parentNode
            : currentTarget;
        const lvl = 1 + StructureHandler.#structArray.findIndex((struct) =>
            struct.substring(0, 10).includes(parent.localName === "main"
                ? currentTarget.localName
                : parent.localName));
        const newDOM = StructureHandler.#parserDOM.createContextualFragment(StructureHandler.#structArray[lvl <= 0 && !document.isHost ? lvl + 1 : lvl])

        /*>---------- [ Set Struct ] ----------<*/
        const dynStruct = newDOM.querySelector(".dynStruct");
        if (dynStruct) {
            if (document.isHost && lvl < StructureHandler.#structArray.length - 1) //Button Insertion
                dynStruct.insertAdjacentHTML("beforeend", StructureHandler.#structArray[0]);

            dynStruct.id = storeData?.id || DataHandler.randomUUIDv4();
            if (!storeData)
                DataHandler.execData("put", [dynStruct.localName], { id: dynStruct.id, order: Date.now(), parent: parent.id });

            for (const input of dynStruct.querySelectorAll(":scope > input, :scope > textarea")) {
                const key = input.classList[0].split("-")[1]
                if (!document.isHost) {
                    input.placeholder = "";
                    dynStruct.localName === "section"
                        ? input.disabled = true
                        : input.style.setProperty("pointer-events", "none");
                }
                else
                    input.addEventListener("change", async (event) => {
                        const { parentNode, value } = event.currentTarget
                        DataHandler.storeInnerData([parentNode.localName, parentNode.id], { [key]: value });
                    })

                if (storeData?.[key])
                    input.value = storeData[key];
            }

            const firstChild = dynStruct.firstElementChild;
            switch (dynStruct.localName) {
                case "section":
                    firstChild.addEventListener("input", StructureHandler.#changeColor);
                    firstChild.dispatchEvent(new Event("input"));
                    if (!document.isHost)
                        firstChild.remove();
                    break;
                case "article":
                    if (!document.isHost) {
                        firstChild.hidden = true;
                        Object.assign(firstChild.nextElementSibling, {
                            hidden: false,
                            innerHTML: DataHandler.parseMD(firstChild.value)
                        });
                    }
                    else 
                        firstChild.addEventListener("input", () => {
                            firstChild.style.height = "21px";
                            firstChild.style.height = firstChild.scrollHeight + "px";
                        });
                    requestAnimationFrame(() => {
                        firstChild.style.height = firstChild.scrollHeight + "px";
                    });
                    break;
                case "div":
                    dynStruct.addEventListener(document.isHost ? "dblclick" : "click", PopupHandler.openPopup);
                    dynStruct.rawMD = storeData?.rawMD || "";
                    document.isHost
                        ? firstChild.addEventListener("click", DropdownHandler.dropdownCall)
                        : firstChild.style.setProperty("pointer-events", "none");
                    if (storeData?.icon)
                        firstChild.setAttribute("icon", storeData.icon);
                    break;
            }
        }

        /*>---------- [ Add Button Action ] ----------<*/
        newDOM.querySelector(".addStructBtn")?.addEventListener("click", StructureHandler.createStruct);

        /*>---------- [ Insert into HTML ] ----------<*/
        parent[document.isHost ? "insertBefore" : "appendChild"](newDOM, parent.lastElementChild);

        return dynStruct;
    }
    static async delete(target) {
        for (const { localName, id } of [...target.querySelectorAll(".dynStruct"), target])
            DataHandler.execData("delete", [localName], id);
        target.remove();
    }
    static async replaceStruct(target, position) {
        position.replaceWith(target);

        const { localName, parentNode } = target;
        [...parentNode.querySelectorAll(":scope > .dynStruct")].forEach((struct, i) => {
            DataHandler.storeInnerData([localName, struct.id], {
                order: Date.now() + i,
                parent: parentNode.id
            });
        });
    }

    static #changeColor(event) {
        event.currentTarget.parentNode.style.setProperty("--sectionColor", event.currentTarget.value);
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

        if (typeof dragging === "boolean") {
            HoverHandler.#selectedStruct = null;
            HoverHandler.#indStruct.classList.toggle("dragStruct", dragging);
        }
    }

    static #hoverStruct(event) {
        event.stopPropagation();
        const { target } = event;
        if (!HoverHandler.#selectedStruct && !target.draggable)
            return;

        const rect = target.getBoundingClientRect();
        Object.assign(HoverHandler.#indStruct.style, {
            transform: `translate(${rect.left}px, ${rect.top}px)`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            transition: ""
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
            target.hidden = true;
            target.parentNode.insertBefore(HoverHandler.#indStruct, target);
        });
    }
    static #dragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        const { target, clientY } = event;
        if (target.id === "deleteStruct")
            return target.appendChild(HoverHandler.#indStruct);

        if (!target.draggable && target.localName !== "main")
            return;

        const { selectedName, parentName } = HoverHandler.#selectedStruct;
        const { nextElementSibling, previousElementSibling } = HoverHandler.#indStruct;
        const structTarget = target.closest(selectedName);
        if (structTarget) {
            const { top, height } = structTarget.getBoundingClientRect();
            const condition = selectedName === "div"
                ? nextElementSibling.id === structTarget.id
                : clientY > top + (height / 2);

            return structTarget.parentNode.insertBefore(
                HoverHandler.#indStruct,
                condition ? structTarget.nextElementSibling : structTarget
            );
        }

        const rectNext = nextElementSibling?.localName === selectedName
            ? nextElementSibling.getBoundingClientRect()
            : null;
        if (clientY < rectNext?.bottom && clientY > Math.min(
            previousElementSibling?.localName === selectedName ? previousElementSibling.getBoundingClientRect().top : Infinity,
            HoverHandler.#indStruct.getBoundingClientRect().top - 1,
            rectNext?.top - 1 || Infinity))
            return;

        if (parentName === target.localName) 
            return target.insertBefore(
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

        StructureHandler[HoverHandler.#indStruct.parentNode.id === "deleteStruct"
            ? "delete"
            : "replaceStruct"](target, HoverHandler.#indStruct);

        document.body.appendChild(HoverHandler.#indStruct);
        target.hidden = false;
        HoverHandler.resetIndicate(false);
    }
}