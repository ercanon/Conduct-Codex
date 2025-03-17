/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener("DOMContentLoaded", async () => {
    isHost = !(new URLSearchParams(window.location.search).get("data"));

    const elemList = [
        "toggleMode",
        "dataUpload",
        "dropdownIcon",
        "indStruct",
        "deleteStruct"
    ].reduce((obj, id) => {
        obj[id] = document.getElementById(id);
        return obj;
    }, {});

    if (!isHost) {
        for (const elem of Object.values(elemList))
            elem.remove()
        return;
    }

    /*>---------- [ initialize Components ] ----------<*/
    const {
        toggleMode,
        dataUpload,
        dropdownIcon,
        indStruct,
        deleteStruct
    } = elemList;

    document.main = document.body.querySelector("main");
    HoverHandler.prepareHover(document.main, indStruct);
    StructureHandler.createStruct({ currentTarget: document.main });

    HoverHandler.prepareHover(deleteStruct);

    StructureHandler.preparePopup(document.getElementById("popupInfo"));

    /*>---------- [ initialize DataBase ] ----------<*/
    DataHandler.setDataBase(document.main);

    /*>---------- [ Initizalize dropdown ] ----------<*/
    StructureHandler.dropdownIcon = dropdownIcon;
    const dropdownList = dropdownIcon.lastElementChild;
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
                    const { client } = StructureHandler.dropdownIcon;
                    if (client) {
                        StructureHandler.dropdownIcon.client.setAttribute("icon", iconName);
                        DataHandler.storeInnerData([client.parentNode.localName, client.parentNode.id], { icon: iconName });
                    }
                    StructureHandler.dropdownClear();
                });

                dropdownList.appendChild(figure);
        });

            StructureHandler.dropdownIcon.addEventListener("mouseleave", StructureHandler.dropdownClear);
            StructureHandler.dropdownIcon.firstElementChild.addEventListener("input", (event) => {
                const textInput = event.currentTarget.value.toLowerCase();
                [...dropdownList.children].forEach(async (icon) =>
                    icon.hidden = !icon.lastElementChild.textContent.toLowerCase().includes(textInput));
            });
        })
        .catch((error) =>
            console.error("Error loading icons", error));

    /*>---------- [ initialize Mode Change ] ----------<*/
    toggleMode.addEventListener("click", (event) => {
        //Determine Mode
        const { currentTarget } = event;
        const btnState = currentTarget.innerText === "Edit Mode";
        currentTarget.innerText = btnState ? "Reorder Mode" : "Edit Mode";

        //Clear utils
        StructureHandler.dropdownClear();
        HoverHandler.resetIndicate(false);
        for (const elem of [deleteStruct, currentTarget])
            elem.setAttribute("data-mode", currentTarget.innerText.split(" ")[0]);

        //Change Mode Elements
        for (const struct of document.getElementsByClassName("dynStruct"))
            struct.draggable = btnState;
        for (const button of document.getElementsByClassName("addStructBtn"))
            button.hidden = btnState;
    });

    /*>---------- [ Initialize Data Handler ] ----------<*/
    const childUpload = dataUpload.firstElementChild;
    dataUpload.addEventListener("click", (event) => {
        if (event.target.localName !== "button")
            return;
        childUpload.click()
    });
    childUpload.addEventListener("change", async (event) => {
        const reader = new FileReader();
        reader.readAsText(event.target.files[0]);

        reader.onload = async () => {
            try {
                const parsedData = JSON.parse(reader.result);

                if (!DataHandler.hasSameNodes(parsedData))
                    throw new Error("Database and File does not share same Nodes");

                const externalBtn = document.main.lastElementChild;
                document.main.innerHTML = "";
                document.main.appendChild(externalBtn);

                await DataHandler.clearAllData();
                DataHandler.parseData(parsedData, externalBtn, true);
            }
            catch (error) {
                console.error("Error parsing file", error);
            }
        };
        reader.onerror = (error) => {
            console.error("Error reading file", error);
        };
    });
    document.getElementById("dataDownload").addEventListener("click", async (event) => {
        if (event.target.localName !== "button")
            return;

        const jsonContent = JSON.stringify(await DataHandler.exportFile(), null, 2);
        if (!jsonContent)
            return alert("No hay contenido JSON para descargar.");

        const dnld = event.target.firstElementChild;
        const url = URL.createObjectURL(new Blob([jsonContent], { type: "application/json" }));

        dnld.href = url;
        dnld.click();

        requestAnimationFrame(() =>
            URL.revokeObjectURL(url));
    });
});

class StructureHandler {
    static dropdownIcon = null;
    static #popupInfo = null;
    static #structArray = [
        `<button class="addStructBtn"></button>`,
        `<section class="dynStruct">
            <input type="color" class="section-color">
            <input type="text" class="section-title" placeholder = "Title">
            <input type="text" class="section-usage" placeholder = "Usage" >
         </section>`,
        `<article class="dynStruct">
            <input type="text" class="article-type" placeholder = "Entry Type">
         </article>`,
        `<div class="dynStruct">
            <iconify-icon icon="material-symbols:add-2-rounded" width="unset" height="unset" noobserver></iconify-icon>
            <input type="text" class="div-title" placeholder = "Title">
            <input type="text" class="div-sub" placeholder = "Subtitle">
         </div>`
    ];
    static #parserDOM = document.createRange();

    static createStruct(event) {
        /*>---------- [ Initialitation ] ----------<*/
        const { currentTarget, targetID, storeData } = event;
        const parent = currentTarget.localName === "button"
            ? currentTarget.parentNode
            : currentTarget;

        const lvl = 1 + StructureHandler.#structArray.findIndex((struct) =>
            struct.substring(0, 10).includes(parent.localName === "main"
                ? currentTarget.localName
                : parent.localName));

        const newDOM = StructureHandler.#parserDOM.createContextualFragment(StructureHandler.#structArray[lvl])

        /*>---------- [ Set Struct ] ----------<*/
        const dynStruct = newDOM.querySelector(".dynStruct");
        if (dynStruct) {
            if (lvl < StructureHandler.#structArray.length - 1) //Button Insertion
                dynStruct.insertAdjacentHTML("beforeend", StructureHandler.#structArray[0]);

            dynStruct.id = targetID || Date.now();
            if (!storeData) 
                DataHandler.execData("put", [dynStruct.localName, { id: dynStruct.id, parent: parent.id || null }], dynStruct.id);

            for (const input of dynStruct.querySelectorAll(":scope > input")) {
                const key = input.classList[0].split("-")[1]
                input.addEventListener("change", (event) => {
                    const { parentNode, value } = event.currentTarget
                    DataHandler.storeInnerData([parentNode.localName, parentNode.id], { [key]: value })
                });

                if (storeData?.[key])
                    input.value = storeData[key];
            }
            if (storeData?.icon)
                dynStruct.querySelector(":scope > iconify-icon").setAttribute("icon", storeData.icon)


            const fistChild = dynStruct.firstElementChild;
            switch (dynStruct.localName) {
                case "section":
                    fistChild.addEventListener("input", StructureHandler.#changeColor);
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

        return dynStruct;
    }
    static delete(target) {
        for (const { localName, id } of [...target.querySelectorAll(".dynStruct"), target])
            DataHandler.execData("delete", [localName, id]);
        target.remove();
    }
    static replaceStruct(target, position) {
        position.replaceWith(target)
        DataHandler.storeInnerData([target.localName, target.id], { parent: target.parentNode.id || null })
    }

    static #changeColor(event) {
        event.currentTarget.parentNode.style.setProperty("--sectionColor", event.currentTarget.value);
    }

    static #dropdownCall(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        StructureHandler.dropdownIcon.style.transform = `translateY(${rect.bottom}px)`;

        const active = StructureHandler.dropdownIcon.client === event.currentTarget
        StructureHandler.dropdownIcon.hidden = active;
        if (active)
            StructureHandler.dropdownIcon.client = null;
        else
            StructureHandler.dropdownIcon.client = event.currentTarget;
    }
    static dropdownClear() {
        StructureHandler.dropdownIcon.client = null;
        StructureHandler.dropdownIcon.hidden = true;
    }

    static preparePopup(popup) {
        popup.addEventListener("click", (event) => {
            if (event.target === popup) {
                popup.hidden = true;
                StructureHandler.#popupInfo.client = null;
            }
        });

        const textEdit = popup.firstElementChild;
        const textResult = popup.querySelector("section > span");
        textEdit.addEventListener("input", (event) =>
            textResult.innerHTML = marked.parse(event.currentTarget.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")));
        textEdit.addEventListener("change", (event) => {
            const { client } = StructureHandler.#popupInfo || {};
            if (client)
                DataHandler.storeInnerData([client.localName, client.id], { rawMD: event.currentTarget.value })
        });

        StructureHandler.#popupInfo = popup.lastElementChild;
    }
    static async #openPopup(event) {
        const { currentTarget } = event;
        if (!currentTarget.draggable) {
            const { children, style, parentNode, previousElementSibling } = StructureHandler.#popupInfo;

            StructureHandler.#popupInfo.client = currentTarget;
            previousElementSibling.value = (await DataHandler.execData("get", [currentTarget.localName, currentTarget.id])).rawMD || "";
            previousElementSibling.dispatchEvent(new Event("input"));

            const getTitleMatch = (attribute, target) =>
                attribute.innerText = target.querySelector(`.${target.localName}-title`)?.value || "";

            const [entryTitle, sectionTitle] = children;
            const section = currentTarget.closest("section.dynStruct");
            const colorVar = "--sectionColor";

            style.setProperty(colorVar, section.style.getPropertyValue(colorVar));
            getTitleMatch(sectionTitle, section);
            getTitleMatch(entryTitle, currentTarget);

            parentNode.hidden = false;
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

        StructureHandler[HoverHandler.#indStruct.parentNode.id === "deleteStruct"
            ? "delete"
            : "replaceStruct"](target, HoverHandler.#indStruct);

        document.body.appendChild(HoverHandler.#indStruct);
        target.hidden = false;
        HoverHandler.resetIndicate(false);
    }
}

class DataHandler {
    static #dataBase = null;
    static #dbOrder = { section: 1, article: 2, div: 3 };

    static async setDataBase() {
        await new Promise((resolve, reject) => {
            const request = indexedDB.open("conductDB");

            request.onupgradeneeded = (event) => {
                const dataBase = event.target.result;
                for (const storeName of Object.keys(DataHandler.#dbOrder)) { 
                    if (!dataBase.objectStoreNames.contains(storeName))
                        dataBase.createObjectStore(storeName);
                };
            };

            request.onsuccess = async (event) => {
                DataHandler.#dataBase = event.target.result;
                DataHandler.parseData(await DataHandler.exportFile(), document.getElementsByClassName("addStructBtn")[0]);
                resolve();
            };
            request.onerror = (event) =>
                reject(event.target.error);
        });
    }

    static async storeInnerData([storeName, pathID, objNode], data) {
        if (!data)
            throw new Error("Trying to save empty data.");

        const request = await DataHandler.execData("get", [storeName, pathID]);
        const storedData = request?.[objNode] || request;
        if (Array.isArray(storedData) && (Array.isArray(data) || typeof data !== "object"))
            data = [...storedData, ...data];
        else if (typeof storedData === "object" && !Array.isArray(storedData) && !Array.isArray(data))
            data = { ...storedData, ...data };

        DataHandler.execData("put", [storeName, data], pathID); //pathID and Data must be switched for "put" to work
    }
    static async execData(funcExec, [storeName, pathID], data) {
        return new Promise((resolve, reject) => {
            const transaction = DataHandler.#dataBase.transaction(storeName, "readwrite");
            const request = transaction.objectStore(storeName)[funcExec](pathID, data);

            request.onsuccess = (event) => resolve(event.target.result || null);
            request.onerror = (event) => reject(event.target.error);
        });
    }
    static async clearAllData() {
        await Promise.all(
            [...DataHandler.#dataBase.objectStoreNames].map((storeName) =>
                DataHandler.execData("clear", [storeName]))
        );
    }

    static async parseData(dataDOM, target, needStoring = false) {
        const orderedKeys = Object.entries(dataDOM)
            .sort(([keyA], [keyB]) =>
                (DataHandler.#dbOrder[keyA] || 99) - (DataHandler.#dbOrder[keyB] || 99));

        target = { null: target };
        for (const [storeName, data] of orderedKeys) {
            const structList = {};           
            for (const [targetID, storeData] of Object.entries(data)) {
                const currentTarget = target[storeData.parent];
                if (currentTarget) {
                    structList[targetID] = StructureHandler.createStruct({ currentTarget, storeData, targetID });
                    if (needStoring)
                        await DataHandler.execData("put", [storeName, { id: targetID, ...storeData }], targetID);
                }
            }
            target = structList;
        }
    }
    static async exportFile() {
        return Object.assign({}, ...await Promise.all(
            [...DataHandler.#dataBase.objectStoreNames].map(async (storeName) => {
                const dataList = await DataHandler.execData("getAll", [storeName]);

                const storeData = dataList.reduce((obj, { id, ...data }) => {
                    obj[id] = data;
                    return obj;
                }, {});

                return { [storeName]: storeData };
            })
        ));
    }

    static hasSameNodes(target) {
        const targetKeys = Object.keys(target);
        const storeNames = [...DataHandler.#dataBase.objectStoreNames];

        return targetKeys.length <= storeNames.length && targetKeys.every((key) =>
            storeNames.includes(key));
    }
}