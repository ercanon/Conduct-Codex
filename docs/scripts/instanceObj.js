class InstanceHandler {
    static #parserDOM = document.createRange()
    static #struc = [
        `<button class="addBtn"></button>`,
        `<section>
            <input type="text" class="section-title" placeholder = "Title">
            <input type="text" class="section-usage" placeholder = "Usage">
         </section>`,
        `<span>
            <input type="text" placeholder = "Entry Type">
         </span>`,
        `<div>
            <iconify-icon></iconify-icon>
            <input type="text">
            <input type="text">
         </div>`
    ];
    constructor(parent, lvlPrev = -1) {
        if (++lvlPrev >= InstanceHandler.#struc.length)
            return console.warn("Structure Array has reached its limit");

        const newDOM = InstanceHandler.#parserDOM.createContextualFragment(InstanceHandler.#struc[lvlPrev]);

        const lvlNextDiv = newDOM.querySelector("section, span, div");
        lvlNextDiv?.insertAdjacentHTML("beforeend", InstanceHandler.#struc[0]);

        newDOM.querySelector("button")?.addEventListener("click", this.createStructure = () =>
            new InstanceHandler(lvlNextDiv || parent, lvlPrev));

        parent.insertBefore(newDOM, parent.lastChild);
    }
    delete (){
         parent.querySelectorAll("button")?.forEach((btn) => 
            btn.removeEventListener("click", this.createStructure));
    }
}