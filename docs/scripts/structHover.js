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
            <input type="text" class="article-type" placeholder="Entry Type">
         </article>`,
        `<div class="dynStruct">
            <iconify-icon icon="material-symbols:add-2-rounded" width="unset" height="unset" noobserver></iconify-icon>
            <input type="text" class="div-title" placeholder="Title">
            <input type="text" class="div-sub" placeholder="Subtitle">
         </div>`
    ];

    static createStruct(event) {
        const isHost = !DataHandler.gistID;
        const { currentTarget, storeData } = event;

        const parent = currentTarget.localName === "button"
            ? currentTarget.parentNode
            : currentTarget;
        const lvl = 1 + StructureHandler.#structArray.findIndex((struct) =>
            struct.substring(0, 10).includes(parent.localName === "main"
                ? currentTarget.localName
                : parent.localName));
        const newDOM = StructureHandler.#parserDOM.createContextualFragment(StructureHandler.#structArray[lvl <= 0 && !isHost ? lvl + 1 : lvl])

        /*>---------- [ Set Struct ] ----------<*/
        const dynStruct = newDOM.querySelector(".dynStruct");
        if (dynStruct) {
            if (isHost && lvl < StructureHandler.#structArray.length - 1) //Button Insertion
                dynStruct.insertAdjacentHTML("beforeend", StructureHandler.#structArray[0]);

            dynStruct.id = storeData?.id || Date.now();
            if (!storeData)
                DataHandler.execData("put", [dynStruct.localName], { id: dynStruct.id, parent: parent.id || parent.localName });

            for (const input of dynStruct.querySelectorAll(":scope > input")) {
                const key = input.classList[0].split("-")[1]
                if (!isHost) {
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
                    if (!isHost)
                        firstChild.remove();
                    break;
                case "article":
                    if (!isHost) {
                        const newText = document.createElement("p");
                        newText.className = firstChild.className;
                        newText.textContent = firstChild.value;
                        firstChild.replaceWith(newText);
                    }
                    break;
                case "div":
                    dynStruct.addEventListener(isHost ? "dblclick" : "click", PopupHandler.openPopup);
                    dynStruct.rawMD = storeData?.rawMD || "";
                    isHost
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
        parent[isHost ? "insertBefore" : "appendChild"](newDOM, parent.lastElementChild);

        return dynStruct;
    }
    static async delete(target) {
        for (const { localName, id } of [...target.querySelectorAll(".dynStruct"), target])
            DataHandler.execData("delete", [localName], id);
        target.remove();
    }
    static async replaceStruct(target, position) {
        position.replaceWith(target);

        const { localName, id, parentNode } = target;

        const dataMap = new Map((await DataHandler.execData("getAll", [localName, "ParentID"])).map((data) => [data.id, data]));
        if (!dataMap.has(id))
            dataMap.set(id, await DataHandler.execData("get", [localName], id));

        const childrenList = [...parentNode.querySelectorAll(":scope > .dynStruct")];
        const sortedIds = childrenList
            .map((child) =>
                child.id)
            .sort((a, b) =>
                Number(a) - Number(b));

        sortedIds.forEach((newId, i) => {
            const data = dataMap.get(childrenList[i].id);
            data.id = childrenList[i].id = newId;
            DataHandler.execData("put", [localName], data);
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

        HoverHandler.#selectedStruct = null;
        HoverHandler.#indStruct.classList.toggle("dragStruct", dragging);
    }

    static #hoverStruct(event) {
        event.stopPropagation();
        const { target } = event;
        if (HoverHandler.#selectedStruct || !target.draggable)
            return;

        const rect = target.getBoundingClientRect();
        const styleValues = target === HoverHandler.#selectedStruct
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
            target.hidden = true;
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
        const rectTarget = target.getBoundingClientRect();
        const isLeftOrTop = selectedName === "div"
            ? event.clientX < rectTarget.left + rectTarget.width / 2
            : event.clientY < rectTarget.top + rectTarget.height / 2;

        if (selectedName === target.localName) {
            target.parentNode.insertBefore(
                HoverHandler.#indStruct,
                isLeftOrTop ? target : target.nextSibling
            );
        }
        else if (parentName === target.localName) {
            target.insertBefore(
                HoverHandler.#indStruct,
                target.lastElementChild
            );
        }
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