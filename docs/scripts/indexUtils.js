/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    isHost = !(new URLSearchParams(window.location.search).get("data"));
    new InstanceHandler(document.body.querySelector("main"));

    /*>---------- [ Header Buttons ] ----------<*/
    document.getElementById("dataDownload").addEventListener("click", () => {

    });
    document.getElementById("dataUpload").addEventListener("click", () => {

    });
});



/*>--------------- { Utilities } ---------------<*/
function showError(message, error) {
    console.error(message, error);
    alert(message);
}
function setList(entries, key) {
    return Object.fromEntries([...entries].map(
        typeof key === "string" ? (value) => [value[key], value] : key)
        .filter((value) => value)
    );
}

class PopupHandler {

}