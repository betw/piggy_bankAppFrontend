Visual Design Cheatsheet

Goal: make a user-interface self-explanatory: communicate how the user can best accomplish their goals, given the elements used in the design.

Layout — How visual components of your page are organized and grouped

Design
• Place elements on a grid
• Sizing conveys importance/hierarchy of elements
• Whitespace can be used to visually distinguish groups

Navigation
• Users optimize for scanning
• Follow F-pattern, start in top-left

Typography — Arranging type to make language legible and appealing

Design
• Different ways of measuring size: font-size differs by type of font, can use larger x-size for small displays
• Sans versus serif has little impact on readability

Navigation
• Scan text left-to-right, easier than centered text

Color — Improving aesthetics, establishing a mood, and communicating groups

Design
• Composition of colors can affect perception of surrounding colors
• Colors are defined by hue, saturation, and lightness, with these values in digital displays using RGB or hex

Composition
• Utilize color wheel to define a palette or theme based on color relationships
• Whitespace can distinguish text

---

Applied in this project (Robinhood/Cash App vibes + pig pink)

- Layout
	- Introduced a centered container (max-width: 1100px) and consistent spacing scale.
	- Header uses a brand gradient with a pink accent underline to separate sections.
	- Cards and forms align to the grid, with clear grouping and whitespace.

- Typography
	- System UI sans stack for performance and legibility.
	- Responsive type scale: h1 clamps between 1.75–2.375rem; h2 between 1.25–1.5rem.

- Color palette (CSS variables)
	- Greens: `--green-400: #00D632`, `--green-500: #00C805`, `--green-600: #00A14B`
	- Pinks: `--pink-300: #FFB3C1`, `--pink-400: #F48FB1`, `--pink-500: #EC77A8`
	- Attention cards use a pink-tinted surface for key goal/notification blocks.

- Components
	- Buttons default to green, with soft tab-style navigation.
	- Inputs have accessible focus rings and rounded corners.
	- Trip/notification cards adopt the pink attention style with cohesive borders and shadows.