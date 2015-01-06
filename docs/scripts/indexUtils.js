/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {

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