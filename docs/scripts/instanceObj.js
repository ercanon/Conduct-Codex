class InstanceHandler {
    static #struc = [
        `<button class="addBtn"></button>`,
        `<section>
            <input type="text">
            <input type="text">
            <div></div>
         </section>`,
        `<span>
            <input type="text">
            <div></div>
         </span>`,
        `<iconify-icon></iconify-icon>
         <input type="text">
         <input type="text">`
    ];
    #lvlStruc = null;
    constructor(parent, lvlPrev) {
        if (++lvlPrev >= InstanceHandler.#struc.length)
            return console.warn("Structure Array has reached its limit");;

        this.#lvlStruc = lvlPrev || 0;
        parent.insertAdjacentHTML(parent.tagName === "button" ? "beforebegin" : "afterbegin", InstanceHandler.#struc[this.#lvlStruc]);

        const lvlNextDiv = parent.querySelector("div");
        lvlNextDiv?.insertAdjacentHTML("afterbegin", InstanceHandler.#struc[0]);

        parent.querySelector("button").addEventListener("click", () => {
            new InstanceHandler(lvlNextDiv || parent, this.#lvlStruc)
        });
    }
}