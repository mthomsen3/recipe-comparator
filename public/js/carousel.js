window.addEventListener('load', function () {
    const carouselSize = 2;
    let currentCard = 0;

    // Get all recipe cards
    const cards = document.querySelectorAll('.carousel-item');

    // Function to update the display of the cards
    function updateCarousel() {
        let maxIngredients = 0;
        let maxHeight = 0;
        let visibleTitleCards = [];

        // Reset heights of title cards
        cards.forEach((card) => {
            let titleCard = card.querySelector('.title-cards .card-body');
            titleCard.style.height = 'auto';
        });

        cards.forEach((card, index) => {
            card.style.display = 'none';

            // Show only the current card and the next one
            if (index >= currentCard && index < currentCard + carouselSize) {
                card.style.display = 'block';

                // Calculate the maximum ingredients for visible cards
                let ingredientsList = card.querySelector('.ingredients ul');
                maxIngredients = Math.max(maxIngredients, ingredientsList.children.length);

                // Push visible title cards into an array
                let titleCard = card.querySelector('.title-cards .card-body');
                visibleTitleCards.push(titleCard);
            }
        });

        // Update the ingredients list
        updateIngredients(maxIngredients);

        // Use setTimeout to wait for next repaint
        setTimeout(() => {
            // Calculate the maximum height for visible title cards
            visibleTitleCards.forEach(titleCard => {
                let titleCardHeight = titleCard.getBoundingClientRect().height;
                maxHeight = Math.max(maxHeight, titleCardHeight);
            });

            // Update visible title cards height
            updateTitleCards(maxHeight);

            // Make ingredients list sortable
            cards.forEach((card, index) => {
                if (index >= currentCard && index < currentCard + carouselSize) {
                    let ingredientsList = card.querySelector('.ingredients ul');
                    new Sortable(ingredientsList, {
                        animation: 200,
                    });
                }
            });
        }, 0);
    }




    // Function to update the ingredients list
    function updateIngredients(maxIngredients) {
        // For the current and the next card
        for (let i = currentCard; i < currentCard + carouselSize; i++) {
            let card = cards[i];

            if (card) {
                let ingredientsList = card.querySelector('.ingredients ul');
                let currentIngredients = ingredientsList.children.length;

                // Add empty <li> elements to each list up to the length of the longest list
                while (currentIngredients < maxIngredients) {
                    let li = document.createElement("li");
                    li.className = "empty";
                    ingredientsList.appendChild(li);
                    currentIngredients++;
                }
            }
        }
    }

    // Function to update the height of title cards
    function updateTitleCards(maxHeight) {
        // For the current and the next card
        for (let i = currentCard; i < currentCard + carouselSize; i++) {
            let card = cards[i];

            if (card) {
                let titleCard = card.querySelector('.title-cards .card-body');
                titleCard.style.height = `${maxHeight}px`;
            }
        }
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
