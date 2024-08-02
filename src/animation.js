    document.addEventListener("DOMContentLoaded", function () {
    const faders = document.querySelectorAll('.fade-in');

    const appearOptions = {
    threshold: 0.2,
    rootMargin: "0px 0px -50px 0px"
};

    const appearOnScroll = new IntersectionObserver(function (entries, appearOnScroll) {
    entries.forEach(entry => {
    if (!entry.isIntersecting) {
} else {
    entry.target.classList.add('appear');
    appearOnScroll.unobserve(entry.target);
}
});
}, appearOptions);

    faders.forEach(fader => {
    appearOnScroll.observe(fader);
});
});
