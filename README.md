# Conduct Codex
### Dynamic reference sheet for TTG rules
This web app was created with the intention of allowing you to dynamically set tabletop game rules and share them with your players. However, with a bit of creativity, it can be used for much more.

Many thanks to [Crobi](https://github.com/crobi) for creating [dnd5e-quickref](https://github.com/crobi/dnd5e-quickref), the repository that inspired the development of this project.

Feel free to follow me to stay updated on my future projects!

## Features  
- Import and export data files.
- GitHub Gist loader on startup if the ID was provided in the URL.
- Create and customize structures.
- Edit, reorder and view mode.
- Markdown support for popup information.
- Selector of [game-icons.net](https://game-icons.net) icons.
- Frontend-only.

---

<details>
<summary><strong> Controls </strong></summary>

  ### Header
- Change mode between Edit and Reorder button.
- Import data file.
- Export data file.
  
### Edit Mode
Clicking the *+ button* will create a structure based on its hierarchy:
1. __Section__: Contains its color, title, and usage inputs.
2. __Article__: Where the type of entry can be defined.
3. __Entry__: Includes the icon, title, and subtitle.
   
Clicking twice on an entry will open the popup, which includes a text input area. The markdown you write in this area will be parsed and displayed in the preview area.

### Reorder Mode
Drag and drop an element to a new position to reorder it, or drop it inside the *bin button* at the bottom of the screen to delete it.

### Gist
Download the data file using the *Export data file* option and upload it publicly to [GitHub Gist](https://gist.github.com).  
After *#gistID=*, insert the Gist ID found at the end of the Gist URL to load the data. Share the resulting URL to activate *Viewer Mode*.

### Viewer Mode
Click on an entry to open its information popup.
</details>

---

<details>
<summary><strong> Dependencies </strong></summary>
  
- [Github Gist](https://gist.github.com)
- [game-icons.net](https://game-icons.net)
- [Iconify Design](https://iconify.design)
- [Marked](https://marked.js.org)
</details>

---

<details>
<summary><strong> Examples </strong></summary>
  
- [5eRules2014](https://ercanon.github.io/Conduct-Codex/#gistID=20d64ce7b0c1c624ee82688dbd9114c0)
</details>
