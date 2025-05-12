# Library of Common Web Resources or Applications

This repo hosts multiple web resources or applications that can be used across various platforms.
Each application is system agnostic, self-contained within its own folder, using common front-end libraries, and runs independently of other applications within this repo.

## Characteristics of the Applications
- Used in the platforms maintained by QLD Online team.
- System agnostic - application can be run / embeded without reying on the platform.
- Self-contained - application is saved in its own folder and run independently. 
- Front-end - focused on front-end applications with minimal to no backend processing.
- Read-Only - simple appplication with no database manipulation, minimising security risk.

### Where these application can be used:
- Content Management System (CMS). eg: Squiz Matrix
- Customer Relationship Management (CRM)
- Stand-alone static application. eg: S3 hosted
- iFrame

## Folder structure:
Folder names should follow the **kebab-case** naming standard, for example: `data-search-widget` or `projects-dashboard`.

Each application should include the following standard files:
- `package.json`
- `README.md`


#### Example of folder & file st:
- `abc-data-display`
  - `css/`
    - `styles.css`
  - `utils/`
    - `helpers.js`
  - `.gitignore`
  - `index.html`
  - `main.js`
  - `package.json`
  - `README.md`

No `node_modules` folder should be included here. It can be included on a separate **release repository** (Work in Progress).