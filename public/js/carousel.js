var pressTimer;

window.addEventListener('load', function () {
    let carouselSize = 2;
    let currentCard = 0;
    let sortableInstances = [];

    // Get all recipe cards
    const cards = document.querySelectorAll('.carousel-item');
    const leftButton = document.getElementById('carousel-left');
    const rightButton = document.getElementById('carousel-right');

    // Get the carousel size buttons
    const carouselSize1Button = document.getElementById('carousel-size-1');
    const carouselSize2Button = document.getElementById('carousel-size-2');

    // Function to update the display of the cards
    function updateCarousel() {
        let maxIngredients = 0;
        let maxHeight = 0;
        let visibleTitleCards = [];

        cards.forEach((card) => {
            let titleCard = card.querySelector('.title-cards .card-body');
            titleCard.style.height = 'auto';
        });

        cards.forEach((card, index) => {
            card.style.display = 'none';
            card.classList.remove('carousel-item-size-1', 'carousel-item-size-2'); // remove both sizes first
            card.classList.add(`carousel-item-size-${carouselSize}`); // then add the current size


            // If there is a Sortable instance for this card, destroy it
            if (sortableInstances[index]) {
                sortableInstances[index].destroy();
                sortableInstances[index] = null;
            }

            // Show only the current card and the next one
            if (index >= currentCard && index < currentCard + carouselSize) {
                card.style.display = 'block';

                let ingredientsList = card.querySelector('.ingredients ul');
                let currentIngredientsCount = ingredientsList.querySelectorAll('li:not(.empty)').length;
                maxIngredients = Math.max(maxIngredients, currentIngredientsCount);

                let titleCard = card.querySelector('.title-cards .card-body');
                visibleTitleCards.push(titleCard);

                // Create a new Sortable instance for this card
                sortableInstances[index] = new Sortable(ingredientsList, {
                    animation: 200,
                    ghostClass: "sortable-ghost", // Class name for the drop placeholder
                    chosenClass: "sortable-chosen", // Class name for the chosen item
                    dragClass: "sortable-drag", // Class name for the dragging item
                    onChoose: function (evt) {
                        evt.item.classList.add('active'); // Change size when chosen
                    },
                    onUnchoose: function (evt) {
                        evt.item.classList.remove('active'); // Revert size when dropped
                    },
                });

            }
        });

        updateIngredients(maxIngredients);

        setTimeout(() => {
            visibleTitleCards.forEach(titleCard => {
                let titleCardHeight = titleCard.getBoundingClientRect().height;
                maxHeight = Math.max(maxHeight, titleCardHeight);
            });

            updateTitleCards(maxHeight);
        }, 0);

        // Disable the left button if we are at the start of the carousel
        leftButton.disabled = currentCard === 0;

        // Disable the right button if we are at the end of the carousel
        rightButton.disabled = currentCard === cards.length - carouselSize;

        // Highlight the currently selected carousel size button
        carouselSize1Button.className = 'carousel-size-button' + (carouselSize === 1 ? ' selected' : '');
        carouselSize2Button.className = 'carousel-size-button' + (carouselSize === 2 ? ' selected' : '');
        // Disable the button of the currently active size
        document.getElementById(`carousel-size-${carouselSize}`).disabled = true;
        // Enable the button of the other size
        document.getElementById(`carousel-size-${carouselSize === 1 ? 2 : 1}`).disabled = false;
    }

    // Add event listeners for the carousel size buttons
    document.getElementById('carousel-size-1').addEventListener('click', function () {
        carouselSize = 1;
        currentCard = Math.min(currentCard, cards.length - carouselSize);
        updateCarousel();
    });

    document.getElementById('carousel-size-2').addEventListener('click', function () {
        carouselSize = 2;
        currentCard = Math.min(currentCard, cards.length - carouselSize);
        updateCarousel();
    });


    // Function to update the ingredients list
    function updateIngredients(maxIngredients) {
        // For the current and the next card
        for (let i = currentCard; i < currentCard + carouselSize; i++) {
            let card = cards[i];

            if (card) {
                let ingredientsList = card.querySelector('.ingredients ul');
                let elements = ingredientsList.children;

                // Remove trailing 'empty' <li> elements
                for (let j = elements.length - 1; j >= 0; j--) {
                    if (elements[j].className === "empty") {
                        elements[j].parentNode.removeChild(elements[j]);
                    } else {
                        // Stop at the first non-empty element
                        break;
                    }
                }

                // Recalculate the current ingredients after removal of empty elements
                let currentIngredients = ingredientsList.querySelectorAll('li').length;

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
    leftButton.addEventListener('click', function () {
        currentCard = Math.max(currentCard - 1, 0);
        updateCarousel();
    });

    rightButton.addEventListener('click', function () {
        currentCard = Math.min(currentCard + 1, cards.length - carouselSize);
        updateCarousel();
    });



});
