window.addEventListener('load', function () {
    var numResultsSelect = document.getElementById('numResultsSelect');

    numResultsSelect.addEventListener('change', function () {
        var numResults = parseInt(this.value);

        updateCards(numResults);
    });

    // Function to update the visibility of the cards
    function updateCards(numResults) {
        const sections = ['title-cards', 'ingredients', 'description', 'instructions'];

        for (let i = 0; i < 10; i++) {
            sections.forEach(section => {
                var card = document.getElementById(section + '-' + i);
                if (card) {
                    card.style.display = (i < numResults) ? 'block' : 'none';
                }
            });
        }

        // Initialize Sortable for ingredients lists and find the longest list
        var maxLength = 0;
        for (let i = 0; i < numResults; i++) {
            let list = document.getElementById("list-" + (i + 1));
            if (list) {
                new Sortable(list, {
                    animation: 200
                });
                maxLength = Math.max(maxLength, list.children.length);
            }
        }

        // Add empty <li> elements to each list up to the length of the longest list
        for (let i = 0; i < numResults; i++) {
            let list = document.getElementById("list-" + (i + 1));
            if (list) {
                Array.from(list.getElementsByClassName("empty")).forEach(element => element.remove());
                while (list.children.length < maxLength) {
                    let li = document.createElement("li");
                    li.className = "empty";
                    list.appendChild(li);
                }
            }
        }
    }

    // We'll use this to dynamically populate the number of results dropdown
    var numResultsFound = document.getElementById('num-results-found');

    // How many recipes do we have?
    var numRecipes = parseInt(document.getElementById('numRecipes').value);
    numResultsFound.innerText = numRecipes;

    // Populate the select menu
    for (let i = 1; i <= numRecipes; i++) {
        var option = document.createElement("option");
        option.value = i;
        option.text = i;
        numResultsSelect.appendChild(option);
    }

    // Show the select menu
    document.getElementById('num-results-menu').style.display = 'block';

    // Manually trigger the change event to initialize the page correctly
    var initialNumResults = Math.min(3, numRecipes);
    updateCards(initialNumResults);

    // Set the selected value of the dropdown
    numResultsSelect.value = initialNumResults.toString();



});
