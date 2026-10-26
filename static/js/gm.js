/*
Game manager
Rhythm game idea:
- Four buttons, a,w,s,d: one for each girl:
    - a: Molly: Normal
    - w: Touka: Slow
    - s: Rin: Intermitent
    - d: Niki: Fast
- Special fifth button: spacebar: Hima?
- Four lanes, one for each girl, from right to left
- Every 5 points, increase difficulty to a maximum of 20
- Combo scale:
    - 1x: Unhappy
    - 2x: Better than Despacito
    - 3x: Niki approves
    - 4x: Maya approves
    - 5x: Best Homie Singer
*/


async function _soft_to_display_none(id, timeout = 500) {
    /**
     * Helper function to hide an element by id with a fade-out effect.
     * @param {string} id - The id of the element to hide.
     */
    const element = document.getElementById(id);
    if (element) {
        let timeout_text = "" + timeout + "ms";
        element.style.transition = `opacity ${timeout_text} ease`;
        element.style.opacity = 0;
        await new Promise(resolve => setTimeout(resolve, timeout));
        element.style.display = "none";
        element.style.opacity = 1; // Reset opacity for future use
    }
}



/******
 * Button handlers
 */

function start_button_handler() {
    /**
     * When pressing start, we hide the start menu and show the game screen. We also start the game loop.
     */
    _soft_to_display_none("main_menu", 10).then(() => {
        document.getElementById("game_screen").style.display = "block";
        start_game_loop();
    });
}


function key_listener(e) {

}


/**
 * Main game loop
 */

function start_game_loop() {
    // Game loop logic here
}