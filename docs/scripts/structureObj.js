/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener("DOMContentLoaded", async () => {
    document.main = document.body.querySelector("main");
    window.urlSearch = new URLSearchParams(window.location.hash.substring(1));
    DataHandler.gistID = window.urlSearch.get("gistID");

    /*>---------- [ Initialize Global Components ] ----------<*/
    StructureHandler.preparePopup(document.getElementById("popupInfo"));
    document.getElementById("dataDownload").addEventListener("click", async (event) => {
        if (event.target.localName !== "button")
            return;

        const jsonContent = !DataHandler.gistID ? JSON.stringify(await DataHandler.exportFile(), null, 2) : sessionStorage.getItem("clientData");
        if (!jsonContent)
            return alert("No hay contenido JSON para descargar.");

        const dnld = event.target.firstElementChild;
        const url = URL.createObjectURL(new Blob([jsonContent], { type: "application/json" }));

        dnld.href = url;
        dnld.click();

        requestAnimationFrame(() =>
            URL.revokeObjectURL(url));
    });

    /*>---------- [ Initialize Client ] ----------<*/
    const elemList = [
        "toggleMode",
        "dataUpload",
        "dropdownIcon",
        "indStruct",
        "deleteStruct",
        "infoInput"
    ].reduce((obj, id) => {
        obj[id] = document.getElementById(id);
        return obj;
    }, {});

    if (DataHandler.gistID) {
        for (const elem of Object.values(elemList))
            elem.remove()

        const response = await fetch(`https://api.github.com/gists/${DataHandler.gistID}`);
        const { content } = Object.values((await response.json()).files)[0];
        sessionStorage.setItem("clientData", content);
        DataHandler.parseData(JSON.parse(content), document.main);
        return;
    }

    /*>---------- [ Initialize Components ] ----------<*/
    window.location.hash = "gistID="
    const {
        toggleMode,
        dataUpload,
        dropdownIcon,
        indStruct,
        deleteStruct
    } = elemList;

    HoverHandler.prepareHover(document.main, indStruct);
    StructureHandler.createStruct({ currentTarget: document.main });

    HoverHandler.prepareHover(deleteStruct);

    /*>---------- [ Initialize DataBase ] ----------<*/
    DataHandler.setDataBase(document.main);

    /*>---------- [ Initialize Dropdown ] ----------<*/
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
                        client.setAttribute("icon", iconName);
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

    /*>---------- [ Initialize Mode Change ] ----------<*/
    toggleMode.addEventListener("click", (event) => {
        //Determine Mode
        const { currentTarget } = event;
        const btnState = currentTarget.innerText === "Edit";
        currentTarget.innerText = btnState ? "Reorder" : "Edit";

        //Clear utils
        StructureHandler.dropdownClear();
        HoverHandler.resetIndicate(false);
        for (const elem of [deleteStruct, currentTarget])
            elem.setAttribute("data-mode", currentTarget.innerText);

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
        childUpload.click();
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
});

/*>--------------- { Structure Logic } ---------------<*/
class StructureHandler {
    static dropdownIcon = null;
    static #popupInfo = null;
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
        const newDOM = StructureHandler.#parserDOM.createContextualFragment(StructureHandler.#structArray[lvl === 0 && !isHost ? lvl + 1 : lvl])

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
                case "div":
                    dynStruct.addEventListener(isHost ? "dblclick" : "click", StructureHandler.#openPopup);
                    dynStruct.rawMD = storeData?.rawMD || "";
                    isHost
                        ? firstChild.addEventListener("click", StructureHandler.#dropdownCall)
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

    /*>--------------- { Color Input Logic } ---------------<*/
    static #changeColor(event) {
        event.currentTarget.parentNode.style.setProperty("--sectionColor", event.currentTarget.value);
    }

    /*>--------------- { Icon Dropdown Logic } ---------------<*/
    static #dropdownCall(event) {
        const { currentTarget } = event;
        const rect = currentTarget.getBoundingClientRect();
        StructureHandler.dropdownIcon.style.transform = `translateY(${rect.bottom}px)`;

        const active = StructureHandler.dropdownIcon.client === currentTarget;
        StructureHandler.dropdownIcon.hidden = active;
        StructureHandler.dropdownIcon.client = active
            ? null
            : currentTarget;
    }
    static dropdownClear() {
        StructureHandler.dropdownIcon.client = null;
        StructureHandler.dropdownIcon.hidden = true;
    }

    /*>--------------- { Popup Logic } ---------------<*/
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
            textResult.innerHTML = DataHandler.parseMD(event.currentTarget.value));
        textEdit.addEventListener("change", async (event) => {
            const { client } = StructureHandler.#popupInfo || {};
            if (client) {
                DataHandler.storeInnerData([client.localName, client.id], { rawMD: event.currentTarget.value });
                client.rawMD = event.currentTarget.value;
            }
        });

        StructureHandler.#popupInfo = popup.lastElementChild;
    }
    static async #openPopup(event) {
        const { currentTarget } = event;
        if (!currentTarget.draggable) {
            const { children, style, parentNode, previousElementSibling } = StructureHandler.#popupInfo;

            const getTitleMatch = (attribute, target) =>
                attribute.innerText = target.querySelector(`.${target.localName}-title`)?.value || "";

            const [entryTitle, sectionTitle, textResult] = children;
            const section = currentTarget.closest("section.dynStruct");
            const colorVar = "--sectionColor";

            if (!previousElementSibling)
                textResult.innerHTML = DataHandler.parseMD(currentTarget.rawMD);
            else {
                StructureHandler.#popupInfo.client = currentTarget;
                previousElementSibling.value = currentTarget.rawMD || "";
                previousElementSibling.dispatchEvent(new Event("input"));
            }

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

class DataHandler {
    static #dataBase = null;
    static #dbOrder = { section: 1, article: 2, div: 3 };
    static gistID = null;

    static async setDataBase() {
        await new Promise((resolve, reject) => {
            const request = indexedDB.open("conductDB");

            request.onupgradeneeded = (event) => {
                const dataBase = event.target.result;
                for (const storeName of Object.keys(DataHandler.#dbOrder)) { 
                    if (!dataBase.objectStoreNames.contains(storeName))
                        dataBase.createObjectStore(storeName, { keyPath: "id" })
                            .createIndex("ParentID", "parent", { unique: false });
                }
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

    //static compressData({ id, ...data }) {
    //    const compressed = fflate.deflateSync(fflate.strToU8(JSON.stringify(data)));
    //    const base64 = btoa(String.fromCharCode(...compressed))
    //        .replace(/\+/g, "-")
    //        .replace(/\//g, "_")
    //        .replace(/=+$/, "");
    //    return `${id}=${base64}&`;
    //}

    static async storeInnerData([storeName, pathID, objNode], data) {
        if (!data)
            throw new Error("Trying to save empty data.");

        const request = await DataHandler.execData("get", [storeName], pathID);
        const storedData = request?.[objNode] || request;
        if (Array.isArray(storedData))
            data = [...storedData, ...(Array.isArray(data) ? data : [data])];
        else if (typeof storedData === "object" && !Array.isArray(storedData))
            data = { ...storedData, ...data };
        else
            throw new Error("New data do not match previous data.");

        DataHandler.execData("put", [storeName], data);
        return data;
    }
    static async execData(funcExec, [storeName, indexName], data) {
        if (typeof funcExec !== "string")
            throw new Error("Function command is not string");

        return new Promise((resolve, reject) => {
            const transaction = DataHandler.#dataBase.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = (indexName ? store.index(indexName) : store)[funcExec](data);

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

        target = { main: target };
        for (const [storeName, data] of orderedKeys) {
            const structList = {};   
            for (const storeData of data) {
                const currentTarget = target[storeData.parent];
                if (currentTarget) {
                    structList[storeData.id] = StructureHandler.createStruct({ currentTarget, storeData });
                    if (needStoring)
                        await DataHandler.execData("put", [storeName], storeData);
                }
            }
            target = structList;
        }
    }
    static async exportFile() {
        return Object.assign({}, ...await Promise.all(
            [...DataHandler.#dataBase.objectStoreNames].map(async (storeName) =>
                ({ [storeName]: await DataHandler.execData("getAll", [storeName]) }))
        ));
    }

    static parseMD(data) {
        return marked.parse(data.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ""));
    }
    static hasSameNodes(target) {
        const targetKeys = Object.keys(target);
        const storeNames = [...DataHandler.#dataBase.objectStoreNames];

        return targetKeys.length <= storeNames.length && targetKeys.every((key) =>
            storeNames.includes(key));
    }
}