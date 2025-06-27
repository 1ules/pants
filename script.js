
// Fix for mobile viewport height
function adjustViewport() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', adjustViewport);
window.addEventListener('load', adjustViewport);
adjustViewport();

// Define vowel ending criteria
const vowelEndingCriteria = {
    name: "Names Ending with Vowels",
    place: "Places Ending with Vowels",
    animal: "Animals Ending with Vowels",
    thing: "Things Ending with Vowels"
};

// Define allowed name criteria
const allowedNameCriteria = [
    'Unisex', 'Biblical Names', 'Three Letter Names',
    'Indian Names', 'Japanese Names', 'Male Names', 'Female Names'
];

// Game state
let gameState = {
    currentRound: 1,
    currentCategory: 'place',
    letters: [],
    criteria: {},
    answers: {},
    results: {},
    hasPlayed: false,
    showingPass: false,
    rerollsUsed: {} 
};

// Add reroll function
function rerollCriteria() {
    const currentRound = gameState.currentRound;
    const currentCategory = gameState.currentCategory;
    
    // Check if already used reroll for this round
    if (gameState.rerollsUsed[currentRound]) {
        return;
    }
    
    // Don't allow reroll on score category or completed categories
    if (currentCategory === 'score') return;
    
    const categoryElement = document.querySelector(`[data-category="${currentCategory}"]`);
    const isCompleted = gameState.results[currentRound] && 
                       gameState.results[currentRound][currentCategory];
    if (isCompleted) return;
    
    // Get all available criteria for this category
    const availableCriteria = categories[currentCategory];
    const currentCriteria = gameState.criteria[currentRound][currentCategory];
    
    // Filter out current criteria and check which ones have valid words for the current letter
    const currentLetter = gameState.letters[currentRound - 1].toLowerCase();
    const validCriteria = availableCriteria.filter(criteria => {
        if (criteria === currentCriteria) return false; // Exclude current criteria
        
        // Get words for this criteria
        const words = getCriteriaWords(currentCategory, criteria);
        
        // Check if any word starts with the current letter
        return words.some(word => word.startsWith(currentLetter));
    });

    if (validCriteria.length === 0) return; // No valid alternatives

    // Mark reroll as used for this round
    gameState.rerollsUsed[currentRound] = true;

    // Hide reroll button
    document.getElementById('rerollBtn').classList.add('hidden');

    // Start slot machine animation
    const criteriaElement = document.getElementById('criteria');
    criteriaElement.classList.add('criteria-animation');

    let animationStep = 0;
    const animationSteps = 20;
    const animationInterval = 100; // 100ms per step = 2 seconds total

    const slotAnimation = setInterval(() => {
        // Show random criteria during animation (can be any from available, just for animation)
        const randomCriteria = availableCriteria[Math.floor(Math.random() * availableCriteria.length)];
        criteriaElement.textContent = randomCriteria;
        
        animationStep++;
        
        if (animationStep >= animationSteps) {
            clearInterval(slotAnimation);
            
            // Select final criteria from valid ones only
            const finalCriteria = validCriteria[Math.floor(Math.random() * validCriteria.length)];
            gameState.criteria[currentRound][currentCategory] = finalCriteria;
            criteriaElement.textContent = finalCriteria;
            
            // Remove animation class
            setTimeout(() => {
                criteriaElement.classList.remove('criteria-animation');
            }, 100);
            
            // Save game state
            saveGameState();
        }
    }, animationInterval);
}

function goHome() {
    // Hide all game areas
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('resultsArea').style.display = 'none';
    document.getElementById('statsArea').style.display = 'none';
    
    // Show start area
    document.getElementById('startArea').style.display = 'block';
    
    // Hide home and info button
    document.getElementById('homeBtn').style.display = 'none';
    document.getElementById('infoBtn').style.display = 'none';
    
    // Check if game is complete to show countdown or start button
    const savedGame = loadGameState();
    if (savedGame && savedGame.isComplete) {
        showCountdown();
    } else {
        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('countdown').style.display = 'none';
    }
}

// Game data
const categories = {
    place: [
        'Places Ending with Vowels', 
        'Located in South America',
        'Located in North America',
        'Located in Africa',
        'Located in Europe', 
        'Located in Asia', 
        'Located in the USA', 
        'Located in Australia', 
        'Island or Archipelago', 
        'Capital City',
        'Tropical Place',
        'Coastal City',
        'Geographical Features',
        'Found in a City',
        'Hospital Rooms and Departments'
        ],
    animal: [
        'Animals Ending with Vowels', 
        '4 Legs or More', 
        'Mammal', 
        'Lives in Water', 
        'Flies', 
        'Cold Blooded', 
        'Warm Blooded', 
        'Carnivore', 
        'Herbivore', 
        'Fictional and Mythological Creatures',
        'Pokemon'
        ],
    name: [
        'Unisex', 
        'Biblical Names',
        'Three Letter Names', 
        'Names Ending with Vowels', 
        'Names from Mythology', 
        'Indian Names', 
        'Japanese Names', 
        'Male Names', 
        'Female Names',
        'Body Parts',
        'Periodic Table Elements',
        'Fruits',
        'Designer and Popular Brands',
        'Car Manufacturers',
        'Popular Sports',
        'Celestial Bodies and Astronomical Objects',
        'Common Occupations',
        'Musical Genres',
        'Emotions',
        'Academic Disciplines and Subjects',
        'Plants and Flowers'
        ],
    
    thing: [
        'Things Ending with Vowels', 
        'Things Made of Metal', 
        'Common Household Items', 
        'Food', 
        'Found in Nature', 
        'Used in School',
        'Sports Related',
        'Found in a Toolbox',
        'Used in the Kitchen', 
        'Liquids', 
        'Musical Instruments',
        'Gems and Minerals',
        'Periodic Table Elements',
        'Technology & Equipment', 
        'Fruits',
        'Designer and Popular Brands',
        'Car Manufacturers',
        'Clothing & Accessories',
        'Something Round/Circular',
        'Snacks',
        'Materials and Substances',
        'Found in a Hospital',
        'Plants and Flowers'
        ]
};

// Initialize game with loading screen
async function initGame() {
    startLoadingScreen();
    
    try {
        const response = await fetch('dictionary.json');
        const dictionaryData = await response.json();
        
        // Ensure dictionary is fully loaded before setting window.dictionary
        if (dictionaryData && typeof dictionaryData === 'object') {
            window.dictionary = dictionaryData;
            console.log('Dictionary loaded successfully', Object.keys(window.dictionary));
        } else {
            throw new Error('Invalid dictionary format');
        }
    } catch (error) {
        console.error('Failed to load dictionary:', error);
        window.dictionary = {};
    }
}

function startLoadingScreen() {
    let progress = 0;
    const zipperPull = document.getElementById('zipperPull');
    const zipperOpened = document.getElementById('zipperOpened');
    const loadingPercentage = document.getElementById('loadingPercentage');
    
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        
        // Cap progress at 95% until dictionary is loaded
        const maxProgress = (window.dictionary && 
                    typeof window.dictionary === 'object' && 
                    Object.keys(window.dictionary).length > 0 &&
                    window.dictionary.animal && 
                    window.dictionary.place) ? 100 : 95;
        
        if (progress >= maxProgress) {
            progress = maxProgress;
            
            // Only complete when dictionary is ready AND we're at 100%
            if (progress >= 100) {
                clearInterval(loadingInterval);
                setTimeout(() => {
                    completeLoading();
                }, 500);
                return;
            }
        }
        
        // Update UI
        const pullPosition = (progress / 100) * 370;
        zipperPull.style.left = pullPosition + 'px';
        zipperOpened.style.width = progress + '%';
        
        if (progress > 10) {
            loadingPercentage.style.opacity = '1';
        }
        
        loadingPercentage.textContent = Math.floor(progress) + '%';
    }, 100);
}

function completeLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    
    // Fade out loading screen
    loadingScreen.style.transition = 'opacity 0.5s ease-out';
    loadingScreen.style.opacity = '0';
    
setTimeout(() => {
    loadingScreen.style.display = 'none';
    
    // Set up event listeners immediately so buttons work
    setupEventListeners();
    
    // Initialize the actual game
    initializeGameLogic();
}, 500);

// Hide info button initially
document.getElementById('infoBtn').style.display = 'none';

}

function showScoreAnimation(categoryElement, points) {
    const scoreText = points === 2 ? '+2' : points === 1 ? '+1' : '+0';
    const colorClass = points === 2 ? 'green' : points === 1 ? 'yellow' : 'red';
    
    // Create the popup element
    const popup = document.createElement('div');
    popup.className = `score-popup ${colorClass}`;
    popup.textContent = scoreText;
    
    // Position it relative to the category element
    const rect = categoryElement.getBoundingClientRect();
    const containerRect = document.querySelector('.container').getBoundingClientRect();
    
    popup.style.position = 'absolute';
    popup.style.left = (rect.left - containerRect.left + rect.width / 2) + 'px';
    popup.style.top = (rect.top - containerRect.top) + 'px';
    popup.style.transform = 'translateX(-50%)';
    
    // Add to container
    document.querySelector('.container').appendChild(popup);
    
    // Remove after animation completes
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 2500);
}

function initializeGameLogic() {
    clearOldGameState();
    const savedGame = loadGameState();
    
    if (savedGame) {
        // Load saved game state
        gameState = {
            currentRound: savedGame.currentRound,
            currentCategory: savedGame.currentCategory,
            letters: savedGame.letters,
            criteria: savedGame.criteria,
            answers: savedGame.answers || {},
            results: savedGame.results || {},
            hasPlayed: savedGame.hasPlayed,
            rerollsUsed: savedGame.rerollsUsed || {},
            showingPass: false
        };
        
        if (savedGame.isComplete) {
            // Game is complete, show results
            document.getElementById('startArea').style.display = 'none';
            document.getElementById('gameArea').style.display = 'none';
            document.getElementById('resultsArea').style.display = 'block';
            document.getElementById('homeBtn').style.display = 'none'; 
            document.getElementById('infoBtn').style.display = 'none';
            showResults();
            displayStats();
        } else {
            // Check if game should actually be complete
            const categories = ['place', 'animal', 'name', 'thing'];
            let allRoundsComplete = true;
            
            for (let round = 1; round <= 3; round++) {
                const roundResults = gameState.results[round] || {};
                const roundComplete = categories.every(cat => roundResults[cat]);
                if (!roundComplete) {
                    allRoundsComplete = false;
                    break;
                }
            }
            
            if (allRoundsComplete) {
                // Game is actually complete, show results
                markGameComplete();
                document.getElementById('startArea').style.display = 'none';
                document.getElementById('gameArea').style.display = 'none';
                document.getElementById('resultsArea').style.display = 'block';
                showResults();
                displayStats();
            } else {
                // Game is in progress, resume
                document.getElementById('startArea').style.display = 'none';
                document.getElementById('gameArea').style.display = 'block';
                document.getElementById('homeBtn').style.display = 'block';
                document.getElementById('infoBtn').style.display = 'block';
                updateGameDisplay();
            }
        }
    } else {
        // New game
        gameState.rerollsUsed = {};
        generateDailyPuzzle();
    }
    createKeyboard();
}

function generateDailyPuzzle() {
    // Use today's date as seed for consistent daily puzzle
    const today = new Date();
    const dateString = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    
    // Simple seeded random function
    function seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    let seed = 0;
    for (let i = 0; i < dateString.length; i++) {
        seed += dateString.charCodeAt(i);
    }

    // Track used criteria to avoid duplicates across rounds
    const usedCriteria = {
        place: new Set(),
        animal: new Set(),
        name: new Set(),
        thing: new Set()
    };
    
    // Generate criteria for each round ensuring no duplicates
    for (let i = 1; i <= 3; i++) {
        gameState.criteria[i] = {};
        
        // For each category, pick a criteria that hasn't been used
        Object.keys(categories).forEach(category => {
            const availableCriteria = categories[category].filter(criteria => 
                !usedCriteria[category].has(criteria)
            );
            
            if (availableCriteria.length === 0) {
                // Fallback: if all criteria used, reset and pick any
                usedCriteria[category].clear();
                availableCriteria.push(...categories[category]);
            }
            
            const selectedCriteria = availableCriteria[
                Math.floor(seededRandom(seed + i * 100 + category.length) * availableCriteria.length)
            ];
            
            gameState.criteria[i][category] = selectedCriteria;
            usedCriteria[category].add(selectedCriteria);
        });
    }
    
    
// Check if dictionary is available for smart letter selection
    if (typeof dictionary !== 'undefined' && window.dictionary) {
        // Smart letter selection (your new logic)
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        gameState.letters = [];
        
        for (let round = 1; round <= 3; round++) {
            const roundCriteria = gameState.criteria[round];
            const validLetters = [];
            
            // Check each letter to see if it has valid words for all categories in this round
            for (let letter of alphabet) {
                const lowerLetter = letter.toLowerCase();
                
                // Check place category - USE getCriteriaWords
                const placeWords = getCriteriaWords('place', roundCriteria.place);
                const hasPlace = placeWords.some(word => word.startsWith(lowerLetter));
                
                // Check animal category - USE getCriteriaWords
                const animalWords = getCriteriaWords('animal', roundCriteria.animal);
                const hasAnimal = animalWords.some(word => word.startsWith(lowerLetter));
                
                // Check thing category - USE getCriteriaWords
                const thingWords = getCriteriaWords('thing', roundCriteria.thing);
                const hasThing = thingWords.some(word => word.startsWith(lowerLetter));
                
                // For name category, check if there are names starting with this letter
                const nameWords = getCriteriaWords('name', roundCriteria.name);
                const hasName = nameWords.some(word => word.startsWith(lowerLetter));
                
                if (hasPlace && hasAnimal && hasThing && hasName) {
                    validLetters.push(letter);
                }
            }
            
            // If no valid letters found, fall back to all letters
            const lettersToChooseFrom = validLetters.length > 0 ? validLetters : alphabet.split('');
            
            // Select a letter that hasn't been used yet
            let selectedLetter;
            let attempts = 0;
            do {
                const letterIndex = Math.floor(seededRandom(seed + round * 1000 + attempts) * lettersToChooseFrom.length);
                selectedLetter = lettersToChooseFrom[letterIndex];
                attempts++;
            } while (gameState.letters.includes(selectedLetter) && attempts < 100);
            
            gameState.letters.push(selectedLetter);
        }
        
        // Fix name criteria for each round
    } else {
        // Fallback to original random letter selection if dictionary not available
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        gameState.letters = [];
        
        let randomIndex = 0;
            while (gameState.letters.length < 3) {
                const letter = alphabet[Math.floor(seededRandom(seed + randomIndex) * 26)];
                if (!gameState.letters.includes(letter)) {
                    gameState.letters.push(letter);
                }
                randomIndex++;
            }
    }
}

function getRandomLetter(excludeLetter, seed = Math.random() * 1000) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    function seededRandom(s) {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    }
    
    let letter;
    let attempts = 0;
    do {
        letter = alphabet[Math.floor(seededRandom(seed + attempts) * 26)];
        attempts++;
    } while (letter === excludeLetter && attempts < 50);
    
    return letter;
}

function showCountdown() {
    document.getElementById('startBtn').style.display = 'none';
    const countdown = document.getElementById('countdown');
    countdown.style.display = 'block';
    
    function updateCountdown() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const diff = tomorrow - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        countdown.textContent = `Next puzzle in ${hours}h ${minutes}m ${seconds}s`;
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function startGame() {
    document.getElementById('startArea').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('homeBtn').style.display = 'block';
    document.getElementById('infoBtn').style.display = 'block';
    createKeyboard();
    
    updateGameDisplay();
}

function updateGameDisplay() {
    // Update round info
    const roundInfo = document.getElementById('roundInfo');
    if (gameState.currentRound === 3) {
        roundInfo.textContent = 'Final Round';
    } else {
        roundInfo.textContent = `Round ${gameState.currentRound}/3`;
    }
    
    // Update letter square
    document.getElementById('letterSquare').textContent = gameState.letters[gameState.currentRound - 1];
    
    // Update criteria
    document.getElementById('criteria').textContent = gameState.criteria[gameState.currentRound][gameState.currentCategory];
    
    // Reset category selection - don't reset completed categories from current round
    document.querySelectorAll('.category').forEach(cat => {
        cat.classList.remove('selected');
        
        if (cat.dataset.category === 'score') {
            cat.style.opacity = '1';
            cat.style.cursor = 'pointer';
            return;
        }
        
        // Check if this category is completed in current round
        const isCompleted = gameState.results[gameState.currentRound] && 
                          gameState.results[gameState.currentRound][cat.dataset.category];
        
        if (isCompleted) {
            // Keep it completed and unclickable
            if (!cat.classList.contains('completed')) {
                cat.classList.add('completed');
                cat.classList.add(gameState.results[gameState.currentRound][cat.dataset.category]);
            }
            cat.style.opacity = '0.8';
            cat.style.cursor = 'not-allowed';
        } else {
            // Make it available for this round
            cat.classList.remove('completed', 'green', 'yellow', 'red');
            cat.style.opacity = '1';
            cat.style.cursor = 'pointer';

            // Ensure input is enabled/disabled properly
            const input = document.getElementById('wordInput');
            if (gameState.currentCategory === 'score') {
                input.disabled = true;
            } else {
                input.disabled = false;
            }
        }
    });
    
    // Select current category if it's not completed
    const currentCategoryElement = document.querySelector(`[data-category="${gameState.currentCategory}"]`);
    if (currentCategoryElement && !currentCategoryElement.classList.contains('completed')) {
        currentCategoryElement.classList.add('selected');
    } else {
        // Find first non-completed category
        const availableCategories = ['place', 'animal', 'name', 'thing'];
        for (let category of availableCategories) {
            const categoryElement = document.querySelector(`[data-category="${category}"]`);
            const isCompleted = gameState.results[gameState.currentRound] && 
                              gameState.results[gameState.currentRound][category];
            if (!isCompleted) {
                gameState.currentCategory = category;
                categoryElement.classList.add('selected');
                document.getElementById('criteria').textContent = gameState.criteria[gameState.currentRound][category];
                break;
            }
        }
    }
    
    updateCategoryName();
    
    // Clear input
    document.getElementById('wordInput').value = '';
    document.getElementById('passPrompt').style.display = 'none';
    gameState.showingPass = false;

    // Ensure input is enabled and submit button is visible for game categories
    document.getElementById('wordInput').disabled = false;
    document.getElementById('submitBtn').style.display = 'inline-block';

    // Show/hide reroll button based on round and category
    const rerollBtn = document.getElementById('rerollBtn');
    const hasUsedReroll = gameState.rerollsUsed[gameState.currentRound];
    const isScoreCategory = gameState.currentCategory === 'score';
    const isCompletedCategory = gameState.results[gameState.currentRound] && 
                               gameState.results[gameState.currentRound][gameState.currentCategory];
    
    if (hasUsedReroll || isScoreCategory || isCompletedCategory) {
        rerollBtn.classList.add('hidden');
    } else {
        rerollBtn.classList.remove('hidden');
    }

}

function updateCategoryName() {
    const categoryNames = document.querySelectorAll('.category-name');
    categoryNames.forEach(name => name.textContent = '');
    
    const selectedCategory = document.querySelector('.category.selected');
    if (selectedCategory) {
        const categoryName = selectedCategory.nextElementSibling;
        const categoryType = selectedCategory.dataset.category;
        const names = {
            place: 'Place',
            animal: 'Animal',
            name: 'Name',
            thing: 'Thing',
            score: 'Score'
        };
        categoryName.textContent = names[categoryType] || '';
    }
}

function selectCategory(category) {
    const input = document.getElementById('wordInput');
    
    if (category === 'score') {
        // Show current score in the input field
        const score = calculateTotalScore();
        input.placeholder = `${score}/24`;
        input.value = '';
        input.disabled = true; // Disable input when on score
        document.getElementById('criteria').textContent = 'Current Score';
        document.getElementById('submitBtn').style.display = 'none'; // Hide submit button
        document.getElementById('rerollBtn').classList.add('hidden'); // Hide reroll button
        
        // Select the score category
        document.querySelectorAll('.category').forEach(cat => cat.classList.remove('selected'));
        document.querySelector(`[data-category="${category}"]`).classList.add('selected');
        
        updateCategoryName();
        return; // Important: return early for score category
    }
    
    // Check if category is already completed for current round
    const categoryElement = document.querySelector(`[data-category="${category}"]`);
    const isCompleted = gameState.results[gameState.currentRound] && 
                       gameState.results[gameState.currentRound][category];
    
    if (isCompleted || categoryElement.classList.contains('completed')) {
        return; // Don't allow selection of completed categories
    }
    
    // For other categories, restore normal functionality
    input.placeholder = 'Type your answer...';
    input.disabled = false;
    document.getElementById('submitBtn').style.display = 'inline-block';
    
    // Show/hide reroll button based on conditions
    const hasUsedReroll = gameState.rerollsUsed[gameState.currentRound];
    const isCompletedCategory = gameState.results[gameState.currentRound] && 
                               gameState.results[gameState.currentRound][category];
    
    if (hasUsedReroll || isCompletedCategory) {
        document.getElementById('rerollBtn').classList.add('hidden');
    } else {
        document.getElementById('rerollBtn').classList.remove('hidden');
    }
    
    gameState.currentCategory = category;
    document.querySelectorAll('.category').forEach(cat => cat.classList.remove('selected'));
    document.querySelector(`[data-category="${category}"]`).classList.add('selected');
    
    updateCategoryName();
    document.getElementById('criteria').textContent = gameState.criteria[gameState.currentRound][category];
    
    // Save current category selection
    saveGameState();
}


function submitAnswer() {
    const input = document.getElementById('wordInput');
    const word = input.value.trim().toLowerCase();
    const currentLetter = gameState.letters[gameState.currentRound - 1].toLowerCase();
    const criteria = gameState.criteria[gameState.currentRound][gameState.currentCategory];
    const category = gameState.currentCategory;
    
    if (gameState.showingPass) {
        return;
    }

    if (!word) {
        gameState.showingPass = true;
        document.getElementById('passPrompt').style.display = 'block';
        return;
    }
    
    // Validate word
    let result = 'red';
    
    // 1. Check if word starts with correct letter
    if (!word.startsWith(currentLetter)) {
        showInputError(`Word must start with ${gameState.letters[gameState.currentRound - 1]}`);
        return;
    }
    
    // 2. Check if word is in category (including plural forms)
    let wordFoundInCategory = false;
    const categoryData = window.dictionary[category];

    // Special handling for names with vowel criteria
    if (category === 'name' && criteria === vowelEndingCriteria.name) {
        // Only check allowed name criteria
        for (const crit of allowedNameCriteria) {
            const words = getCriteriaWords(category, crit);
            if (words.includes(word) || 
               (word.endsWith('s') && words.includes(word.slice(0, -1))) ){
                wordFoundInCategory = true;
                break;
            }
        }
    } 
    // Special handling for place/animal/thing with vowel criteria
    else if (vowelEndingCriteria[category] && criteria === vowelEndingCriteria[category]) {
        // Allow any word in the category
        if (categoryData) {
            for (const criteriaKey in categoryData) {
                // Skip vowel ending criteria itself
                if (criteriaKey === vowelEndingCriteria[category]) continue;
                
                const words = getCriteriaWords(category, criteriaKey);
                if (words.includes(word) || 
                   (word.endsWith('s') && words.includes(word.slice(0, -1))) ){
                    wordFoundInCategory = true;
                    break;
                }
            }
        }
    }
    // Standard category validation for other cases
    else {
        if (categoryData) {
            for (const criteriaKey in categoryData) {
                const words = getCriteriaWords(category, criteriaKey);
                if (words.includes(word) || 
                   (word.endsWith('s') && words.includes(word.slice(0, -1))) ){
                    wordFoundInCategory = true;
                    break;
                }
            }
        }
    }

    if (!wordFoundInCategory) {
        showInputError(`Try another ${category}`);
        return;
    }

    // 3. Check if word matches specific criteria
    let matchesCriteria = false;

    // Vowel criteria validation for all categories
    if (vowelEndingCriteria[category] && criteria === vowelEndingCriteria[category]) {
        const lastChar = word.charAt(word.length - 1).toLowerCase();
        matchesCriteria = ['a','e','i','o','u'].includes(lastChar);
    } else {
        // Standard criteria validation
        const criteriaWords = getCriteriaWords(category, criteria);
        if (criteriaWords.includes(word) || 
           (word.endsWith('s') && criteriaWords.includes(word.slice(0, -1))) ){
            matchesCriteria = true;
        }
    }

    if (matchesCriteria) {
        result = 'green'; // Perfect match
    } else {
        result = 'yellow'; // Right category but wrong criteria
    }
    
    // Store result
    gameState.results[gameState.currentRound] = gameState.results[gameState.currentRound] || {};
    gameState.results[gameState.currentRound][category] = result;
    gameState.answers[gameState.currentRound] = gameState.answers[gameState.currentRound] || {};
    gameState.answers[gameState.currentRound][category] = word;

    // Save game state
    saveGameState();
    
    // Clear input and errors
    showInputSuccess(result, word);
    
    nextCategory();
}

function getCriteriaWords(category, criteria) {
    const categoryData = window.dictionary[category];
    if (!categoryData) return [];
    
    const criteriaData = categoryData[criteria];
    
    // Handle shared criteria references
    if (typeof criteriaData === 'string' && criteriaData.startsWith('@sharedCriteria.')) {
        const sharedKey = criteriaData.replace('@sharedCriteria.', '');
        return window.dictionary.sharedCriteria?.[sharedKey] || [];
    }
    
    // Special handling for vowel criteria
    if (vowelEndingCriteria[category] && criteria === vowelEndingCriteria[category]) {
        // For names: use allowed criteria
        if (category === 'name') {
            const allNames = [];
            allowedNameCriteria.forEach(crit => {
                const words = getCriteriaWords(category, crit);
                allNames.push(...words);
            });
            return [...new Set(allNames)].filter(name => 
                ['a','e','i','o','u'].includes(name.charAt(name.length-1)));
        } 
        // For place/animal/thing: use all category words
        else {
            const allWords = [];
            for (const crit in categoryData) {
                // Skip vowel criteria itself
                if (crit === vowelEndingCriteria[category]) continue;
                
                const words = getCriteriaWords(category, crit);
                allWords.push(...words);
            }
            return [...new Set(allWords)].filter(word => 
                ['a','e','i','o','u'].includes(word.charAt(word.length-1)));
        }
    }
    
    // Standard case
    return Array.isArray(criteriaData) ? criteriaData : [];
}

function nextCategory() {
    const categories = ['place', 'animal', 'name', 'thing'];
    
    // Update category square color
const categorySquare = document.querySelector(`[data-category="${gameState.currentCategory}"]`);
const result = gameState.results[gameState.currentRound][gameState.currentCategory];
categorySquare.classList.add('completed', result);

// Show score animation
const points = result === 'green' ? 2 : result === 'yellow' ? 1 : 0;
showScoreAnimation(categorySquare, points);
    
    // Check if all categories are completed in current round
    const currentRoundResults = gameState.results[gameState.currentRound] || {};
    const allCategoriesCompleted = categories.every(cat => currentRoundResults[cat]);
    
    if (allCategoriesCompleted) {
        // Round complete
        document.getElementById('wordInput').disabled = true;
        if (gameState.currentRound < 3) {
            document.getElementById('submitBtn').style.display = 'none';
            document.getElementById('nextRoundBtn').style.display = 'inline-block';

            // Add spotlight effect
            document.getElementById('spotlightOverlay').classList.add('active');
            document.getElementById('nextRoundBtn').classList.add('spotlight');
            
        } else {
            // Game complete
            endGame();
        }
    } else {
        // Move to next incomplete category
        const nextCategory = categories.find(cat => !currentRoundResults[cat]);
        
        if (nextCategory) {
            gameState.currentCategory = nextCategory;
            updateGameDisplay();
        }
    }
}

function nextRound() {
    // Remove spotlight effect
    document.getElementById('spotlightOverlay').classList.remove('active');
    document.getElementById('nextRoundBtn').classList.remove('spotlight');
    gameState.currentRound++;
    gameState.currentCategory = 'place';
    document.getElementById('wordInput').disabled = false;
    document.getElementById('submitBtn').style.display = 'inline-block';
    document.getElementById('nextRoundBtn').style.display = 'none';
    
    // Reset all category colors for new round
    document.querySelectorAll('.category').forEach(cat => {
        if (cat.dataset.category !== 'score') {
            cat.classList.remove('completed', 'green', 'yellow', 'red');
        }
    });

    // Reset reroll button visibility for new round
    document.getElementById('rerollBtn').classList.remove('hidden');
    
    updateGameDisplay();

    saveGameState();
}

function endGame() {
    // Mark game as complete
    markGameComplete();
    
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('resultsArea').style.display = 'block';
    document.getElementById('homeBtn').style.display = 'none';
    document.getElementById('infoBtn').style.display = 'none';
    showResults();
    displayStats();
}

function addLetter(letter) {
    // Prevent typing when on score screen
     if (gameState.currentCategory === 'score' || document.getElementById('wordInput').disabled) return;
    
    const input = document.getElementById('wordInput');
    input.value += letter.toLowerCase();
    input.focus();
    pulseInputCircle();
}

function deleteLetter() {
    // Prevent deleting when on score screen
    if (gameState.currentCategory === 'score' || document.getElementById('wordInput').disabled) return;

    const input = document.getElementById('wordInput');
    input.value = input.value.slice(0, -1);
    input.focus();
    pulseInputCircle();
}

function showResults() {
    const resultGrid = document.getElementById('resultGrid');
    resultGrid.innerHTML = '';
    
    let totalScore = 0;
    const categories = ['place', 'animal', 'name', 'thing'];
    
    for (let round = 1; round <= 3; round++) {
        categories.forEach(category => {
            const square = document.createElement('div');
            square.className = `result-square ${gameState.results[round][category]}`;
            
            const scores = { green: 2, yellow: 1, red: 0 };
            totalScore += scores[gameState.results[round][category]];
            
            resultGrid.appendChild(square);
        });
    }
    
    document.getElementById('finalScore').textContent = `Score: ${totalScore}/24`;
    
// Enable scrolling for results screen
document.documentElement.classList.add('results-view'); // Add to html element
document.body.classList.add('results-view');
document.querySelector('.container').classList.add('results-view');
    
    // Show round details section
    document.getElementById('roundDetailsArea').style.display = 'block';
    
    // Initialize round breakdown
    setupRoundBreakdown();
    showRoundDetails(1);
}

function setupRoundBreakdown() {
    document.querySelectorAll('.round-btn').forEach(btn => {
        btn.onclick = () => {
            const round = parseInt(btn.dataset.round);
            document.querySelectorAll('.round-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showRoundDetails(round);
        };
    });
}

function showRoundDetails(round) {
    const roundContent = document.getElementById('roundContent');
    const letter = gameState.letters[round - 1];
    const categories = ['place', 'animal', 'name', 'thing'];
    
    let html = `<div class="round-letter">Letter: ${letter}</div>`;
    
    categories.forEach(category => {
        const criteria = gameState.criteria[round][category];
        const userAnswer = gameState.answers[round] && gameState.answers[round][category] 
            ? gameState.answers[round][category] 
            : 'Passed';
        
        // Get possible answers
        let possibleAnswers = [];
        const words = getCriteriaWords(category, criteria);
        if (words.length > 0) {
            possibleAnswers = words
                .filter(word => word.startsWith(letter.toLowerCase()))
                .slice(0, 5);
        }
        
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        
        html += `
            <div class="category-detail">
                <div class="category-title">${categoryName}: ${criteria}</div>
                <div class="user-answer">Your answer: ${userAnswer}</div>
                <div class="possible-answers">
                    ${possibleAnswers.length > 0 
                        ? `Possible answers: ${possibleAnswers.join(', ')}` 
                        : 'No examples available'}
                </div>
            </div>
        `;
    });
    
    roundContent.innerHTML = html;
}

function shareResults() {
    const categories = ['place', 'animal', 'name', 'thing'];
    let shareText = 'PANTS Puzzle\n';
    shareText += new Date().toLocaleDateString() + '\n';
    
    for (let round = 1; round <= 3; round++) {
        categories.forEach(category => {
            const result = gameState.results[round][category];
            const emoji = { green: '🟩', yellow: '🟨', red: '🟥' };
            shareText += emoji[result];
        });
        shareText += '\n';
    }
    
    const totalScore = calculateTotalScore();
    shareText += `Score: ${totalScore}/24`;
    
    // Check if Web Share API is available (typically on mobile)
    if (navigator.share) {
        navigator.share({
            text: shareText
        }).catch(err => {
            console.log('Error sharing:', err);
            // Fallback to clipboard copy if sharing fails
            fallbackCopyToClipboard(shareText);
        });
    } else {
        // Desktop/unsupported browsers - copy to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Results copied to clipboard!');
            }).catch(() => {
                fallbackCopyToClipboard(shareText);
            });
        } else {
            fallbackCopyToClipboard(shareText);
        }
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        alert('Results copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy: ', err);
        // Show the text in an alert as last resort
        alert('Copy failed. Here are your results:\n\n' + text);
    }
    
    document.body.removeChild(textArea);
}

function createKeyboard() {
    const keyboard = document.getElementById('keyboard');

    keyboard.innerHTML = '';
    
    // First row - QWERTYUIOP (10 keys)
    'QWERTYUIOP'.split('').forEach(letter => {
        const key = document.createElement('button');
        key.className = 'key';
        key.textContent = letter;
        key.onclick = () => addLetter(letter);
        keyboard.appendChild(key);
    });
    
    // Second row - ASDFGHJKL← (9 letters + 1 arrow = 10 keys)
    'ASDFGHJKL'.split('').forEach(letter => {
        const key = document.createElement('button');
        key.className = 'key';
        key.textContent = letter;
        key.onclick = () => addLetter(letter);
        keyboard.appendChild(key);
    });
    
    const backspaceKey = document.createElement('button');
    backspaceKey.className = 'key';
    backspaceKey.textContent = '←';
    backspaceKey.onclick = deleteLetter;
    keyboard.appendChild(backspaceKey);
    
    // Third row - ZXCVBNM PASS CLEAR (7 letters + 1 pass + 1 clear spanning 2 = 10 total width)
    'ZXCVBNM'.split('').forEach(letter => {
        const key = document.createElement('button');
        key.className = 'key';
        key.textContent = letter;
        key.onclick = () => addLetter(letter);
        keyboard.appendChild(key);
    });
    
    const passKey = document.createElement('button');
    passKey.className = 'key';
    passKey.textContent = 'PASS';
    passKey.onclick = passWord;
    keyboard.appendChild(passKey);
    
    const clearKey = document.createElement('button');
    clearKey.className = 'key wide';
    clearKey.textContent = 'CLEAR';
    clearKey.onclick = clearInput;
    keyboard.appendChild(clearKey);
}

function passWord() {
    // Prevent passing when on score screen
    if (gameState.currentCategory === 'score' || document.getElementById('wordInput').disabled) return;
    
    // Show pass prompt directly (same as when submitting empty word)
    gameState.showingPass = true;
    document.getElementById('passPrompt').style.display = 'block';
}

function clearInput() {
    // Prevent clearing when on score screen
    if (gameState.currentCategory === 'score') return;
    
    const input = document.getElementById('wordInput');
    input.value = '';
    input.placeholder = 'Type your answer...';
    input.focus();
    pulseInputCircle();
}

function pulseInputCircle() {
    const inputCircle = document.querySelector('.text-input');
    inputCircle.classList.remove('pulse');
    // Trigger reflow to restart animation
    void inputCircle.offsetWidth;
    inputCircle.classList.add('pulse');
}

function setupEventListeners() {
    const wordInput = document.getElementById('wordInput');
    
    document.getElementById('startBtn').onclick = startGame;
    document.getElementById('submitBtn').onclick = submitAnswer;
    document.getElementById('nextRoundBtn').onclick = nextRound;
    document.getElementById('shareBtn').onclick = shareResults;
    document.getElementById('homeBtn').onclick = goHome;
    document.getElementById('infoBtn').onclick = toggleInfo;
    document.getElementById('rerollBtn').onclick = rerollCriteria;

    document.getElementById('howToPlayBtn').onclick = () => {
    document.getElementById('howToPlayModal').style.display = 'flex';
};

document.getElementById('closeHowToPlay').onclick = () => {
    document.getElementById('howToPlayModal').style.display = 'none';
};

// Close modal when clicking outside
document.getElementById('howToPlayModal').onclick = (e) => {
    if (e.target === document.getElementById('howToPlayModal')) {
        document.getElementById('howToPlayModal').style.display = 'none';
    }
};
    
    // Category selection
    document.querySelectorAll('.category').forEach(category => {
        category.onclick = () => selectCategory(category.dataset.category);
    });
    
    // Prevent mobile keyboard from appearing
    if ('ontouchstart' in window) {
        wordInput.addEventListener('touchstart', (e) => {
            e.preventDefault();
            wordInput.blur();
        });
    }
    
    // Handle physical keyboard input
    document.addEventListener('keydown', (e) => {
        // Only process if game area is visible
        if (document.getElementById('gameArea').style.display !== 'block') return;
        
        // Don't allow typing when on score category OR when input is disabled
        if (gameState.currentCategory === 'score' || document.getElementById('wordInput').disabled) return;
        
        // Handle key presses
        if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
            e.preventDefault();
            addLetter(e.key);
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            deleteLetter();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            submitAnswer();
        }
    });
}

function calculateTotalScore() {
    let total = 0;
    const scores = { green: 2, yellow: 1, red: 0 };
    const categories = ['place', 'animal', 'name', 'thing'];
    
    for (let round = 1; round <= 3; round++) {
        const roundResults = gameState.results[round] || {};
        categories.forEach(category => {
            const result = roundResults[category];
            if (result) {
                total += scores[result];
            }
        });
    }
    return total;
}

function getStoredStats() {
    const defaultStats = {
        pantsSolved: 0,
        totalGames: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastPlayedDate: null,
        scoreDistribution: {
            '20-24': 0,
            '10-19': 0,
            '0-9': 0
        },
        gamesPlayed: {} // Will store date -> score mapping
    };
    
    try {
        const stored = localStorage.getItem('pantsGameStats');
        if (stored) {
            const parsedStats = JSON.parse(stored);
            // Merge with defaults to handle any missing properties
            return { ...defaultStats, ...parsedStats };
        }
    } catch (error) {
        console.log('Error reading stats from localStorage:', error);
    }
    
    return defaultStats;
}

function saveStats(stats) {
    try {
        localStorage.setItem('pantsGameStats', JSON.stringify(stats));
    } catch (error) {
        console.log('Error saving stats to localStorage:', error);
    }
}

function saveGameState() {
    const today = new Date().toDateString();
    const gameData = {
        date: today,
        currentRound: gameState.currentRound,
        currentCategory: gameState.currentCategory,
        letters: gameState.letters,
        criteria: gameState.criteria,
        answers: gameState.answers,
        results: gameState.results,
        hasPlayed: gameState.hasPlayed,
        rerollsUsed: gameState.rerollsUsed,
        isComplete: false
    };
    
    try {
        localStorage.setItem('pantsGameState', JSON.stringify(gameData));
    } catch (error) {
        console.log('Error saving game state:', error);
    }
}

function loadGameState() {
    try {
        const stored = localStorage.getItem('pantsGameState');
        if (stored) {
            const gameData = JSON.parse(stored);
            const today = new Date().toDateString();
            
            // Only load if it's from today
            if (gameData.date === today) {
                return gameData;
            }
        }
    } catch (error) {
        console.log('Error loading game state:', error);
    }
    return null;
}

function markGameComplete() {
    const today = new Date().toDateString();
    const gameData = {
        date: today,
        currentRound: gameState.currentRound,
        currentCategory: gameState.currentCategory,
        letters: gameState.letters,
        criteria: gameState.criteria,
        answers: gameState.answers,
        results: gameState.results,
        hasPlayed: true,
        isComplete: true
    };
    
    try {
        localStorage.setItem('pantsGameState', JSON.stringify(gameData));
    } catch (error) {
        console.log('Error marking game complete:', error);
    }
}

function clearOldGameState() {
    // Clear game state from previous days
    const stored = loadGameState();
    if (!stored) {
        localStorage.removeItem('pantsGameState');
    }
}

function updateStats(currentScore) {
    const stats = getStoredStats();
    const today = new Date().toDateString();
    
    // Check if already played today
    if (stats.gamesPlayed[today]) {
        return stats; // Don't update if already played today
    }
    
    // Record today's game
    stats.gamesPlayed[today] = currentScore;
    
    // Update score distribution
    if (currentScore >= 20) {
        stats.scoreDistribution['20-24']++;
    } else if (currentScore >= 10) {
        stats.scoreDistribution['10-19']++;
    } else {
        stats.scoreDistribution['0-9']++;
    }
    
    // Only count as win if score is 10 or above
    stats.pantsSolved++;

    stats.totalGames++;
    
    // Calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();
    
    if (stats.lastPlayedDate === yesterdayString || stats.lastPlayedDate === null) {
        // Streak continues or this is first game
        stats.currentStreak++;
    } else {
        // Streak broken
        stats.currentStreak = 1;
    }
    
    // Update best streak
    if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
    }
    
    stats.lastPlayedDate = today;
    
    // Save to localStorage
    saveStats(stats);
    
    return stats;
}

function hasPlayedToday() {
    const stats = getStoredStats();
    const today = new Date().toDateString();
    return stats.gamesPlayed[today] !== undefined;
}

function displayStats() {
    const currentScore = calculateTotalScore();
    let stats;
    
    // Only update stats if this is a fresh completion
    if (!hasPlayedToday()) {
        stats = updateStats(currentScore);
    } else {
        stats = getStoredStats();
    }
    
    // Update statistics display
    document.getElementById('pantsSolved').textContent = stats.pantsSolved;
    document.getElementById('currentStreak').textContent = stats.currentStreak;
    document.getElementById('bestStreak').textContent = stats.bestStreak;
    
    // Update distribution bars
    const maxCount = Math.max(...Object.values(stats.scoreDistribution));
    
    const dist20to24 = document.getElementById('dist20to24');
    const dist10to19 = document.getElementById('dist10to19');
    const dist0to9 = document.getElementById('dist0to9');
    
    // Calculate bar widths as percentages
    const width20to24 = maxCount > 0 ? (stats.scoreDistribution['20-24'] / maxCount) * 100 : 0;
    const width10to19 = maxCount > 0 ? (stats.scoreDistribution['10-19'] / maxCount) * 100 : 0;
    const width0to9 = maxCount > 0 ? (stats.scoreDistribution['0-9'] / maxCount) * 100 : 0;
    
    dist20to24.style.width = Math.max(width20to24, 15) + '%'; // Minimum width for visibility
    dist10to19.style.width = Math.max(width10to19, 15) + '%';
    dist0to9.style.width = Math.max(width0to9, 15) + '%';
    
    dist20to24.textContent = stats.scoreDistribution['20-24'];
    dist10to19.textContent = stats.scoreDistribution['10-19'];
    dist0to9.textContent = stats.scoreDistribution['0-9'];
    
    // Show the stats area
    document.getElementById('statsArea').style.display = 'block';
}

// Initialize the game
initGame();

// Pass button handlers
document.getElementById('passYesBtn').onclick = function() {
    // User confirmed pass
    gameState.results[gameState.currentRound] = gameState.results[gameState.currentRound] || {};
    gameState.results[gameState.currentRound][gameState.currentCategory] = 'red';
    gameState.answers[gameState.currentRound] = gameState.answers[gameState.currentRound] || {};
    gameState.answers[gameState.currentRound][gameState.currentCategory] = '';

    // Save game state
    saveGameState();

    document.getElementById('passPrompt').style.display = 'none';
    gameState.showingPass = false;
    nextCategory();
};

document.getElementById('passNoBtn').onclick = function() {
    document.getElementById('passPrompt').style.display = 'none';
    gameState.showingPass = false;
};

let infoMode = false;

function toggleInfo() {
    const infoBtn = document.getElementById('infoBtn');
    infoMode = !infoMode;
    
    if (infoMode) {
        infoBtn.classList.add('active');
        showInfoOverlays();
    } else {
        infoBtn.classList.remove('active');
        hideInfoOverlays();
    }
}

function showInfoOverlays() {
    const overlays = [
        { selector: '#roundInfo', text: 'Current Round' },
        { selector: '#letterSquare', text: 'Answers must begin with this letter' },
        { selector: '.categories', text: 'Categories' }, 
        { selector: '.criteria', text: 'Solve to get bonus points' },
        { selector: '#rerollBtn', text: 'Rerolls current criteria. You have 1 reroll per round' },
    ];
    
    overlays.forEach((overlay, index) => {
        const element = document.querySelector(overlay.selector);
        if (element && !element.classList.contains('hidden')) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'info-overlay';
            infoDiv.textContent = overlay.text;
            infoDiv.id = `info-${index}`;
            
            const rect = element.getBoundingClientRect();
            const containerRect = document.querySelector('.container').getBoundingClientRect();
            
            infoDiv.style.left = (rect.left - containerRect.left + rect.width / 2) + 'px';
            infoDiv.style.top = (rect.top - containerRect.top + rect.height / 2) + 'px';
            infoDiv.style.display = 'block';
            
            document.querySelector('.container').appendChild(infoDiv);
        }
    });
}

function hideInfoOverlays() {
    document.querySelectorAll('.info-overlay').forEach(overlay => {
        overlay.remove();
    });
}


function showInputError(message) {
    const input = document.getElementById('wordInput');
    const inputContainer = input.closest('.text-input');
    const originalPlaceholder = input.placeholder;
    
    // Clear input and show error message
    input.value = '';
    input.placeholder = message;
    
    // Add error animation classes to the container
    inputContainer.classList.add('error-shake', 'error-glow');
    
    // Remove animation classes and restore placeholder after animation
    setTimeout(() => {
        inputContainer.classList.remove('error-shake', 'error-glow');
        input.placeholder = originalPlaceholder;
    }, 1500);
}


function showInputSuccess(result, word) {
    const input = document.getElementById('wordInput');
    const inputContainer = input.closest('.text-input');
    
    const messages = {
        green: [
            'Perfect!', 'Excellent!', 'Spot on!', 'Brilliant!', 'Amazing!',
            'Fantastic!', 'Outstanding!', 'Well done!', 'Superb!', 'Genius!',
            'Flawless!', 'Impeccable!', 'Masterful!', 'Unbeatable!', 'Magnificent!',
            'Exceptional!', 'Stupendous!', 'Phenomenal!', 'Incredible!', 'Spectacular!',
            'Wonderful!', 'Bravo!', 'Nailed it!', 'You got it!', 'Absolutely!',
            'Precisely!', 'Exactly!', 'Bingo!', 'Exemplary!', 'Distinguished!',
            'Commendable!', 'Triumphant!', 'Victoriously!', 'Top-notch!', 'First-rate!',
            'High-five!', "You're a star!", 'Correct!', 'Right!', 'Yes!'
        ],
        yellow: [
            'Good word!', 'Nice try!', 'Not bad!', 'Good effort!',
            'Getting there!', 'Solid attempt!', 'On the right track!', 'Decent!',
            'Fair enough!', 'Acceptable!', 'Respectable!', 'Competent!', 'Adequate!',
            'Satisfactory!', 'Well done!', 'You got it!', 'That works!'
        ]
    };
    
    // Show success message
    const messageArray = messages[result];
    const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
    input.value = '';
    input.placeholder = randomMessage;
    
    // Add success glow
    const glowClass = result === 'green' ? 'success-glow-green' : 'success-glow-yellow';
    inputContainer.classList.add(glowClass);
    
    // Remove glow and restore placeholder after animation
    setTimeout(() => {
        inputContainer.classList.remove(glowClass);
        input.placeholder = 'Type your answer...';
    }, 1500);
}
