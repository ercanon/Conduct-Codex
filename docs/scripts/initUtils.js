/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener("DOMContentLoaded", async () => {
    document.main = document.body.querySelector("main");
    window.urlSearch = new URLSearchParams(window.location.hash.substring(1));
    DataHandler.gistID = window.urlSearch.get("gistID");

    /*>---------- [ Initialize Global Components ] ----------<*/
    PopupHandler.preparePopup(document.getElementById("popupInfo"));
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
    DropdownHandler.prepareDropdown(dropdownIcon);
    StructureHandler.createStruct({ currentTarget: document.main });

    HoverHandler.prepareHover(deleteStruct);
    DataHandler.setDataBase(document.main);

    /*>---------- [ Initialize Mode Change ] ----------<*/
    toggleMode.addEventListener("click", (event) => {
        //Determine Mode
        const { currentTarget } = event;
        const btnState = currentTarget.innerText === "Edit";
        currentTarget.innerText = btnState ? "Reorder" : "Edit";

        //Clear utils
        DropdownHandler.dropdownClear();
        HoverHandler.resetIndicate(false);
        for (const elem of [deleteStruct, currentTarget])
            elem.setAttribute("data-mode", currentTarget.innerText);

        //Change Mode Elements
        for (const struct of document.getElementsByClassName("dynStruct"))
            struct.draggable = btnState;
        for (const button of document.getElementsByClassName("addStructBtn"))
            button.hidden = btnState;
    });

    /*>---------- [ Initialize Header Buttons ] ----------<*/
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

class DropdownHandler {
    static #dropdownIcon = null;

    static prepareDropdown(dropdown) {
        DropdownHandler.#dropdownIcon = dropdown;
        const dropdownList = dropdown.lastElementChild;
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
                        const { client } = dropdown;
                        if (client) {
                            client.setAttribute("icon", iconName);
                            DataHandler.storeInnerData([client.parentNode.localName, client.parentNode.id], { icon: iconName });
                        }
                        DropdownHandler.dropdownClear();
                    });

                    dropdownList.appendChild(figure);
                });

                dropdown.addEventListener("mouseleave", DropdownHandler.dropdownClear);
                document.main.addEventListener("scroll", () => {
                    if (!dropdown.hidden)
                        DropdownHandler.dropdownClear()
                });
                dropdown.firstElementChild.addEventListener("input", (event) => {
                    const textInput = event.currentTarget.value.toLowerCase();
                    [...dropdownList.children].forEach(async (icon) =>
                        icon.hidden = !icon.lastElementChild.textContent.toLowerCase().includes(textInput));
                });
            })
            .catch((error) =>
                console.error("Error loading icons", error));
    }
    static dropdownCall(event) {
        const { currentTarget } = event;

        const active = DropdownHandler.#dropdownIcon.client === currentTarget;
        DropdownHandler.#dropdownIcon.hidden = active;

        const rectClient = currentTarget.getBoundingClientRect();
        const rectDropdown = DropdownHandler.#dropdownIcon.getBoundingClientRect();
        DropdownHandler.#dropdownIcon.style.transform = `translateY(${window.screen.height < rectClient.bottom + rectDropdown.height
            ? rectClient.top - rectDropdown.height - 10
            : rectClient.bottom}px)`;

        DropdownHandler.#dropdownIcon.client = active
            ? null
            : currentTarget;
    }
    static dropdownClear() {
        DropdownHandler.#dropdownIcon.client = null;
        DropdownHandler.#dropdownIcon.hidden = true;
    }
}

class PopupHandler {
    static #popupInfo = null;

    static preparePopup(popup) {
        popup.addEventListener("click", (event) => {
            if (event.target === popup) {
                popup.hidden = true;
                PopupHandler.#popupInfo.client = null;
            }
        });

        const textEdit = popup.firstElementChild;
        const textResult = popup.querySelector("section > span");
        textEdit.addEventListener("input", (event) =>
            textResult.innerHTML = DataHandler.parseMD(event.currentTarget.value));
        textEdit.addEventListener("change", async (event) => {
            const { client } = PopupHandler.#popupInfo || {};
            if (client) {
                DataHandler.storeInnerData([client.localName, client.id], { rawMD: event.currentTarget.value });
                client.rawMD = event.currentTarget.value;
            }
        });

        PopupHandler.#popupInfo = popup.lastElementChild;
    }
    static async openPopup(event) {
        const { currentTarget } = event;
        if (!currentTarget.draggable) {
            const { children, style, parentNode, previousElementSibling } = PopupHandler.#popupInfo;

            const getTitleMatch = (attribute, target) =>
                attribute.innerText = target.querySelector(`.${target.localName}-title`)?.value || "";

            const [entryTitle, sectionTitle, textResult] = children;
            const section = currentTarget.closest("section.dynStruct");
            const colorVar = "--sectionColor";

            if (!previousElementSibling)
                textResult.innerHTML = DataHandler.parseMD(currentTarget.rawMD);
            else {
                PopupHandler.#popupInfo.client = currentTarget;
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