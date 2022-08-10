
export const findElUntil = (start: HTMLElement, validator: (el: HTMLElement) => boolean, stop = document.body) => {
    while (start !== stop && start) {
        if (validator(start)) return start
        start = start.parentElement!
    }
    if (start && validator(start)) return start
}