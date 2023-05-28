// Declare numRecipes, numResultsSelect, prevButton, nextButton and firstVisibleCard at the top of the script
var numRecipes, numResultsSelect, prevButton, nextButton, firstVisibleCard;

window.addEventListener('load', function () {
    numResultsSelect = document.getElementById('numResultsSelect');
    prevButton = document.getElementById('desktop-carousel-left');
    nextButton = document.getElementById('desktop-carousel-right');
    firstVisibleCard = 0;  // This will keep track of the first visible card

    numResultsSelect.addEventListener('change', function () {
        updateCards();
    });

    prevButton.addEventListener('click', function () {
        firstVisibleCard = Math.max(firstVisibleCard - 1, 0);  // Decrease the index of the first visible card by 1
        updateCards();
    });

    nextButton.addEventListener('click', function () {
        firstVisibleCard = Math.min(firstVisibleCard + 1, numRecipes - parseInt(numResultsSelect.value));  // Increase the index of the first visible card by 1, but not beyond the index of the last set of visible cards
        updateCards();
    });

    // How many recipes do we have?
    numRecipes = parseInt(document.getElementById('numRecipes').value);

    // Populate the select menu
    for (let i = 1; i <= numRecipes; i++) {
        var option = document.createElement("option");
        option.value = i;
        option.text = i;
        numResultsSelect.appendChild(option);
    }

    // Show the select menu
    document.getElementById('num-results-menu').style.display = 'block';

    // Set the selected value of the dropdown
    numResultsSelect.value = Math.min(3, numRecipes).toString();

    // Manually trigger the change event to initialize the page correctly
    updateCards();
});

// Function to enable/disable the buttons based on the firstVisibleCard index
function updateButtons() {
    prevButton.disabled = (firstVisibleCard === 0);
    nextButton.disabled = (firstVisibleCard + parseInt(numResultsSelect.value) >= numRecipes);
}

// Array to store Sortable instances
let sortableInstances = [];
function updateCards() {
    var numResults = parseInt(numResultsSelect.value);
    const sections = ['title-cards', 'ingredients', 'description', 'instructions'];

    // Create or update Sortable instances
    for (let i = 0; i < numRecipes; i++) {
        // If there is a Sortable instance for this list, destroy it
        if (sortableInstances[i]) {
            sortableInstances[i].destroy();
            sortableInstances[i] = null;
        }

        // Create a new Sortable instance for this list
        let list = document.getElementById("list-" + (i + 1));
        if (list) {
            sortableInstances[i] = new Sortable(list, {
                animation: 200
            });
        }
    }

    // Remove trailing empty <li> elements
    for (let i = 0; i < numRecipes; i++) {
        let list = document.getElementById("list-" + (i + 1));
        if (list) {
            let elements = list.children;
            for (let j = elements.length - 1; j >= 0; j--) {
                if (elements[j].className === "empty") {
                    elements[j].parentNode.removeChild(elements[j]);
                } else {
                    // Stop at the first non-empty element
                    break;
                }
            }
        }
    }


    for (let i = 0; i < numRecipes; i++) {
        sections.forEach(section => {
            var card = document.getElementById(section + '-' + i);
            if (card) {
                card.style.display = (i >= firstVisibleCard && i < firstVisibleCard + numResults) ? 'block' : 'none';
            }
        });

        // Find the longest list among visible lists
        var maxLength = 0;
        for (let i = firstVisibleCard; i < firstVisibleCard + numResults; i++) {
            let list = document.getElementById("list-" + (i + 1));
            if (list) {
                maxLength = Math.max(maxLength, list.children.length);
            }
        }

        // Add empty <li> elements to each visible list up to the length of the longest list
        for (let i = firstVisibleCard; i < firstVisibleCard + numResults; i++) {
            let list = document.getElementById("list-" + (i + 1));
            if (list) {
                while (list.children.length < maxLength) {
                    let li = document.createElement("li");
                    li.className = "empty";
                    list.appendChild(li);
                }
            }
        }
    }

    updateButtons();

    // Update the number of results found
    document.getElementById('num-results-found').innerText = numRecipes;
}
