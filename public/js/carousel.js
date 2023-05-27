window.addEventListener('load', function () {
    // Get all recipe cards
    const cards = document.querySelectorAll('.card');
    let currentCard = 0;
    const carouselSize = 2;

    // Function to update the display of the cards
    function updateCarousel() {
        cards.forEach((card, index) => {
            card.style.display = 'none';

            // Show only the current card and the next one
            if (index >= currentCard && index < currentCard + carouselSize) {
                card.style.display = 'block';
            }
        });
    }

    // Update the carousel on load
    updateCarousel();

    // Add event listeners for the left and right buttons
    document.getElementById('carousel-left').addEventListener('click', function () {
        currentCard = Math.max(currentCard - 1, 0);
        updateCarousel();
    });

    document.getElementById('carousel-right').addEventListener('click', function () {
        currentCard = Math.min(currentCard + 1, cards.length - carouselSize);
        updateCarousel();
    });
});
