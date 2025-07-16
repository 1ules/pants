const CURRENT_VERSION = '0.0.3'; 

function checkVersion() {
    const savedVersion = localStorage.getItem('pantsVersion');
    
    if (savedVersion !== CURRENT_VERSION) {
        // Preserve stats while clearing game state
        const stats = localStorage.getItem('pantsGameStats');
        
        // Clear all game-related data except stats
        localStorage.removeItem('pantsGameState');
        
        // Save stats back if they existed
        if (stats) {
            localStorage.setItem('pantsGameStats', stats);
        }
        
        // Update to current version
        localStorage.setItem('pantsVersion', CURRENT_VERSION);
    }
}

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
        
        // Special handling for Letter Pattern to show the pattern instead of the text
        if (randomCriteria === 'Letter Pattern') {
            // Generate a temporary pattern for animation purposes
            const tempPattern = generatePattern(currentRound, currentCategory);
            criteriaElement.textContent = tempPattern.pattern;
        } else {
            criteriaElement.textContent = randomCriteria;
        }
        
        animationStep++;
        
        if (animationStep >= animationSteps) {
            clearInterval(slotAnimation);
            
            // Select final criteria from valid ones only
            const finalCriteria = validCriteria[Math.floor(Math.random() * validCriteria.length)];
            gameState.criteria[currentRound][currentCategory] = finalCriteria;
            
            // Update display based on final criteria
            if (finalCriteria === 'Letter Pattern') {
                const pattern = getPatternForRound(currentRound, currentCategory);
                criteriaElement.textContent = pattern.pattern;
            } else {
                criteriaElement.textContent = finalCriteria;
            }
            
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
        'Countries in South America',
        'Located in South America',
        'Countries in North America',
        'Located in North America',
        'Countries in Africa',
        'Located in Africa',
        'Countries in Europe',
        'Located in Europe', 
        'Countries in Asia',
        'Located in Asia', 
        'Countries in Oceania',
        'Located in Oceania',
        'States of America', 
        'Capital City',
        'Geographical Features',
        'Found in a City',
        'Hospital Rooms and Departments',
        'Planets and Moons',
        'Around the House',
        'Letter Pattern'
        ],

    animal: [
        'Animals Ending with Vowels', 
        'Mammal', 
        'Aquatic', 
        'Flies or Glides', 
        'Cold Blooded', 
        'Warm Blooded', 
        'Carnivore', 
        'Herbivore', 
        'Fictional and Mythological Creatures',
        'Reptiles',
        'Insects',
        'Prehistoric Animals',
        'Chinese Zodiac',
        'Brands with Animal Logos/Mascots',
        'Letter Pattern'
        ],

    name: [
        'Unisex', 
        'Biblical Names',
        'Three Letter Names', 
        'Names Ending with Vowels', 
        'Names from Mythology', 
        'Male Names', 
        'Female Names',
        'Body Parts',
        'Popular Sports',
        'Celestial Bodies and Astronomical Objects',
        'Common Occupations',
        'Musical Genres',
        'Emotions',
        'Academic Disciplines and Subjects',
        'Colors',
        'Geometric Shapes and Forms',
        'Languages',
        'Superheroes and Villains',
        'One Half of a Popular Duo',
        'Disney Characters',
        'Letter Pattern',
        //shared criterias
        'Car Manufacturers',
        'Popular Brands',
        'Designer/Luxury Brands',
        'Electronic Brands',
        'Sports Brands',
        'Periodic Table Elements',
        'Fruits',
        'Plants and Flowers',
        'Fiat Currencies',
        'Pasta and Bread',
        'Herbs and Spices',
        'Alcoholic Drinks'
        ],    

    thing: [
        'Things Ending with Vowels', 
        'Has Metal', 
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
        'Technology & Equipment', 
        'Clothing & Accessories',
        'Something Round/Circular',
        'Snacks',
        'Materials and Substances',
        'Found in a Hospital',
        'Letter Pattern',
        //shared criterias
        'Car Manufacturers', 
        'Popular Brands',
        'Designer/Luxury Brands',
        'Electronic Brands',
        'Sports Brands',
        'Fruits',       
        'Plants and Flowers',
        'Periodic Table Elements',
        'Fiat Currencies',
        'Pasta and Bread',
        'Herbs and Spices',
        'Alcoholic Drinks',
        'Brands with Animal Logos/Mascots'
        ],

};

// Initialize game with loading screen
async function initGame() {
    checkVersion();
    startLoadingScreen();
    
    try {
        const response = await fetch('dictionary.json');
        const dictionaryData = await response.json();
        
        if (dictionaryData && typeof dictionaryData === 'object') {
            window.dictionary = dictionaryData;
        } else {
            throw new Error('Invalid dictionary format');
        }
    } catch (error) {
        console.error('Failed to load dictionary:', error);
        window.dictionary = {};
    }
    
    // Initialize the actual game logic after dictionary loads
    initializeGameLogic();
}

function startLoadingScreen() {
    let progress = 0;
    const zipperContainer = document.querySelector('.zipper-container');
    const zipperTeethTop = document.querySelector('.zipper-teeth-top');
    const zipperTeethBottom = document.querySelector('.zipper-teeth-bottom');
    const zipperPull = document.getElementById('zipperPull');
    const zipperOpened = document.getElementById('zipperOpened');
    const loadingPercentage = document.getElementById('loadingPercentage');
    
    // Add zipper slider element
    const zipperSlider = document.createElement('div');
    zipperSlider.className = 'zipper-slider';
    zipperContainer.appendChild(zipperSlider);

    const loadingInterval = setInterval(() => {
        // Determine maxProgress (100 only when dictionary is ready)
        const maxProgress = (window.dictionary && 
                           typeof window.dictionary === 'object' && 
                           Object.keys(window.dictionary).length > 0 &&
                           window.dictionary.animal && 
                           window.dictionary.place) ? 100 : 99;
        
        // Increment progress but cap at maxProgress
        const increment = Math.random() * 15 + 5;
        progress = Math.min(progress + increment, maxProgress);
        
        // Calculate pull position (0-370px for 400px container)
        const pullPosition = (progress / 100) * 370;
        zipperPull.style.left = pullPosition + 'px';
        
        // Update opened width (with separation effect)
        zipperOpened.style.width = progress + '%';
        
        // Animate teeth separation
        const separation = (progress / 100) * 10; // 0-10px separation at 100%
        zipperTeethTop.style.transform = `translateY(${-separation}px)`;
        zipperTeethBottom.style.transform = `translateY(${separation}px)`;
        
        // Move slider with pull
        zipperSlider.style.left = pullPosition + 'px';
        zipperSlider.style.width = (400 - pullPosition) + 'px';
        
        // Update percentage display
        if (progress > 10) {
            loadingPercentage.style.opacity = '1';
        }
        loadingPercentage.textContent = Math.floor(progress) + '%';
        
        // Complete loading when we reach 100%
        if (progress >= 100) {
            clearInterval(loadingInterval);
            setTimeout(() => {
                completeLoading();
            }, 500);
            return;
        }
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
    checkVersion();
    clearOldGameState();
    const savedGame = loadGameState();
    
    // Always start by showing the start area
    document.getElementById('startArea').style.display = 'block';
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('resultsArea').style.display = 'none';
    document.getElementById('statsArea').style.display = 'none';
    document.getElementById('homeBtn').style.display = 'none';
    document.getElementById('infoBtn').style.display = 'none';

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
            document.getElementById('resultsArea').style.display = 'block';
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
                document.getElementById('resultsArea').style.display = 'block';
                showResults();
                displayStats();
            } else {
                // Game is in progress - show start menu with start button
                document.getElementById('startBtn').style.display = 'inline-block';
                document.getElementById('countdown').style.display = 'none';
            }
        }
    } else {
        // New game
        gameState.rerollsUsed = {};
        generateDailyPuzzle();
        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('countdown').style.display = 'none';
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

    // Initialize score color
    const inputContainer = document.querySelector('.text-input');
    inputContainer.classList.remove('score-green', 'score-yellow', 'score-red');
    
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
    
    // Update criteria - special handling for Letter Pattern
    const currentCriteria = gameState.criteria[gameState.currentRound][gameState.currentCategory];
    if (currentCriteria === 'Letter Pattern') {
        const pattern = getPatternForRound(gameState.currentRound, gameState.currentCategory);
        document.getElementById('criteria').textContent = pattern.pattern;
    } else {
        document.getElementById('criteria').textContent = currentCriteria;
    }
    
    // Rest of the function remains the same...
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
                // Update criteria display for the new category
                const newCriteria = gameState.criteria[gameState.currentRound][category];
                if (newCriteria === 'Letter Pattern') {
                    const pattern = getPatternForRound(gameState.currentRound, category);
                    document.getElementById('criteria').textContent = pattern.pattern;
                } else {
                    document.getElementById('criteria').textContent = newCriteria;
                }
                break;
            }
        }
    }
    
    updateCategoryName();
    
    // Clear input
    document.getElementById('wordInput').value = '';
    document.getElementById('wordInput').classList.remove('valid-green', 'valid-yellow');
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
    input.classList.remove('valid-green', 'valid-yellow');
    const inputContainer = document.querySelector('.text-input');

    // Clear input text whenever any category is clicked
    input.value = '';
    input.placeholder = 'Type your answer...';
    inputContainer.classList.remove('score-green', 'score-yellow', 'score-red');
    pulseInputCircle(); 
    
    if (category === 'score') {
        const score = calculateTotalScore();
        input.value = '';
        input.placeholder = `${score}/24`;
        input.disabled = true;
        document.getElementById('criteria').textContent = 'Current Score';
        document.getElementById('submitBtn').style.display = 'none';
        
        // Remove all color classes first
        inputContainer.classList.remove('score-green', 'score-yellow', 'score-red');
        
        // Add appropriate color class based on score
        if (score >= 20) {
            inputContainer.classList.add('score-green');
        } else if (score >= 10) {
            inputContainer.classList.add('score-yellow');
        } else {
            inputContainer.classList.add('score-red');
        }
        
        // Select the score category
        document.querySelectorAll('.category').forEach(cat => cat.classList.remove('selected'));
        document.querySelector(`[data-category="${category}"]`).classList.add('selected');
        
        updateCategoryName();
        return;
    }
    
    // For other categories, remove score coloring
    inputContainer.classList.remove('score-green', 'score-yellow', 'score-red');
    input.placeholder = 'Type your answer...';
    input.disabled = false;
    document.getElementById('submitBtn').style.display = 'inline-block';
    
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
    
    // Update criteria display - special handling for Letter Pattern
    const criteria = gameState.criteria[gameState.currentRound][category];
    if (criteria === 'Letter Pattern') {
        const pattern = getPatternForRound(gameState.currentRound, category);
        document.getElementById('criteria').textContent = pattern.pattern;
    } else {
        document.getElementById('criteria').textContent = criteria;
    }
    
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
        updatePassMessage();
        gameState.showingPass = true;
        document.getElementById('passPrompt').style.display = 'block';
        return;
    }
    
    // Validate word
    let result = 'red';
    
    // 1. Check if word starts with correct letter (applies to all criteria)
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
    } 
    // Letter pattern criteria validation
    else if (criteria === 'Letter Pattern') {
        // Get the pattern for this round/category
        const pattern = getPatternForRound(gameState.currentRound, gameState.currentCategory);
        matchesCriteria = checkWordAgainstPattern(word, pattern);
    }
    else {
        // Standard criteria validation
        const criteriaWords = getCriteriaWords(category, criteria);
        if (criteriaWords.includes(word) || 
           (word.endsWith('s') && criteriaWords.includes(word.slice(0, -1))) ){
            matchesCriteria = true;
        }
    }

    // With this: (FIXED LOGIC)
    if (matchesCriteria) {
        result = 'green'; 
    } else {
        result = 'yellow'; // Word is in category but not criteria
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

// Helper function to get the pattern for a specific round and category
function getPatternForRound(round, category) {
    // This should return the pattern that was generated for this round/category
    // We need to store this in gameState when generating the criteria
    if (!gameState.patterns) gameState.patterns = {};
    if (!gameState.patterns[round]) gameState.patterns[round] = {};
    
    // If pattern doesn't exist, generate one
    if (!gameState.patterns[round][category]) {
        gameState.patterns[round][category] = generatePattern(round, category);
    }
    
    return gameState.patterns[round][category];
}

// Helper function to generate a pattern for a round/category
function generatePattern(round, category) {
    const currentLetter = gameState.letters[round - 1].toLowerCase();
    const words = getCriteriaWords(category, 'Letter Pattern');
    
    // Filter words that start with the current letter and are exactly 5 letters
    const validWords = words.filter(word => 
        word.startsWith(currentLetter) && word.length === 5
    );
    
    if (validWords.length === 0) {
        // Fallback pattern if no 5-letter words found - use a default consonant
        return {
            pattern: `${currentLetter.toUpperCase()} _ _ _ _`,
            consonant: 'l',
            position: 2
        };
    }
    
    // Pick a random word from valid 5-letter words
    const randomWord = validWords[Math.floor(Math.random() * validWords.length)];
    
    // Find consonants in the word (excluding first letter)
    const consonants = [];
    for (let i = 1; i < randomWord.length; i++) {
        const char = randomWord[i];
        if (!['a','e','i','o','u'].includes(char)) {
            consonants.push({ char, position: i });
        }
    }
    
    // If no consonants found, use a default
    if (consonants.length === 0) {
        return {
            pattern: `${currentLetter.toUpperCase()} _ l _ _`,
            consonant: 'l',
            position: 2
        };
    }
    
    // Pick a random consonant from the word
    const selectedConsonant = consonants[Math.floor(Math.random() * consonants.length)];
    
    // Generate the 5-letter pattern string
    let patternStr = currentLetter.toUpperCase();
    for (let i = 1; i < 5; i++) {
        if (i === selectedConsonant.position) {
            patternStr += ' ' + selectedConsonant.char.toUpperCase();
        } else {
            patternStr += ' _';
        }
    }
    
    return {
        pattern: patternStr,
        consonant: selectedConsonant.char,
        position: selectedConsonant.position
    };
}

// Helper function to check if a word matches a pattern
function checkWordAgainstPattern(word, pattern) {
    // Check if word starts with the first letter (already checked in submitAnswer)
    if (word[0].toLowerCase() !== pattern.pattern[0].toLowerCase()) {
        return false;
    }
    
    // Enforce 5-letter words only
    if (word.length !== 5) {
        return false;
    }
    
    // Check the consonant is in the right position
    return word[pattern.position] === pattern.consonant;
}

function getCriteriaWords(category, criteria) {
    const categoryData = window.dictionary[category];
    if (!categoryData) return [];
    
    // Handle letter pattern criteria
    if (criteria === 'Letter Pattern') {
        // For letter pattern, we need to return all words in the category
        const allWords = [];
        for (const crit in categoryData) {
            // Skip shared criteria references and vowel criteria
            if (crit === vowelEndingCriteria[category] || 
                (typeof categoryData[crit] === 'string' && categoryData[crit].startsWith('@sharedCriteria.'))) {
                continue;
            }
            
            const words = Array.isArray(categoryData[crit]) ? categoryData[crit] : [];
            allWords.push(...words);
        }
        return [...new Set(allWords)]; // Remove duplicates
    }
    
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
    if (gameState.currentCategory === 'score' || document.getElementById('wordInput').disabled) return;
    
    const input = document.getElementById('wordInput');
    input.value += letter.toLowerCase();
    input.focus();
    pulseInputCircle();
    
    // Add real-time validation
    validateInputRealTime();
}

function deleteLetter() {
    if (gameState.currentCategory === 'score' || document.getElementById('wordInput').disabled) return;

    const input = document.getElementById('wordInput');
    input.value = input.value.slice(0, -1);
    input.focus();
    pulseInputCircle();
    
    // Add real-time validation
    validateInputRealTime();
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
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
        
        // Get the result for this category
        const result = gameState.results[round][category] || 'red';
        
        // Get possible answers
        let allValidWords = [];
        const words = getCriteriaWords(category, criteria);
        
        if (criteria === 'Letter Pattern') {
            const pattern = getPatternForRound(round, category);
            allValidWords = words.filter(word => 
                word.startsWith(letter.toLowerCase()) && 
                word.length === 5 && 
                word[pattern.position] === pattern.consonant
            );
        } else if (words.length > 0) {
            allValidWords = words.filter(word => word.startsWith(letter.toLowerCase()));
        }
        
        // Convert user answer to lowercase for comparison
        const userAnswerLower = userAnswer.toLowerCase();
        // Compute base form (remove trailing 's' if present)
        const userBase = userAnswerLower.endsWith('s') ? userAnswerLower.slice(0, -1) : userAnswerLower;
        
        let possibleAnswersText = '';
        if (userAnswer === 'Passed') {
            // If passed, show up to 5 random words
            shuffleArray(allValidWords);
            const displayWords = allValidWords.slice(0, 5);
            possibleAnswersText = displayWords.length > 0 
                ? `Possible answers: ${displayWords.join(', ')}` 
                : 'No examples available';
        } else {
            // Check if user got the only possible answer
            if (allValidWords.length === 1 && userBase === allValidWords[0]) {
                possibleAnswersText = 'Congratulations! You got the only answer for this criteria!';
            } else {
                // Remove user's answer (base form) from the list
                const remainingWords = allValidWords.filter(word => word !== userBase);
                
                // Shuffle and take up to 5 random words
                shuffleArray(remainingWords);
                const displayWords = remainingWords.slice(0, 5);
                
                if (displayWords.length > 0) {
                    possibleAnswersText = `Other answers: ${displayWords.join(', ')}`;
                } else {
                    possibleAnswersText = 'No examples available';
                }
            }
        }
        
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        
        html += `
            <div class="category-detail">
                <div class="category-title">${categoryName}: ${criteria === 'Letter Pattern' ? 
                    getPatternForRound(round, category).pattern : criteria}</div>
                <div class="user-answer ${result}">Your answer: ${userAnswer}</div>
                <div class="possible-answers">
                    ${possibleAnswersText}
                </div>
            </div>
        `;
    });
    
    roundContent.innerHTML = html;
}

function showModal(message) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.className = 'modal-close-btn';
    
    // Create message text
    const messageText = document.createElement('p');
    messageText.textContent = message;
    messageText.className = 'modal-message';
    
    // Assemble modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(messageText);
    modalOverlay.appendChild(modalContent);
    
    // Function to close modal
    function closeModal() {
        if (modalOverlay.parentNode) {
            modalOverlay.parentNode.removeChild(modalOverlay);
        }
    }
    
    // Close on X button click
    closeButton.addEventListener('click', closeModal);
    
    // Close on overlay click (outside the modal)
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    // Add to page
    document.body.appendChild(modalOverlay);
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
    
    // Check if user is on mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    
    // Only use Web Share API on mobile
    if (isMobile && navigator.share) {
        navigator.share({
            text: shareText
        }).catch(err => {
            console.log('Error sharing:', err);
            // Fallback to clipboard copy if sharing fails
            fallbackCopyToClipboard(shareText);
        });
    } else {
        // Desktop/PC - copy to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(shareText).then(() => {
                showModal('Results copied to clipboard!');
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
        key.setAttribute('data-letter', letter);
        key.onclick = () => addLetter(letter);
        keyboard.appendChild(key);
    });
    
    // Second row - ASDFGHJKL (9 keys, centered)
    'ASDFGHJKL'.split('').forEach(letter => {
        const key = document.createElement('button');
        key.className = 'key';
        key.textContent = letter;
        key.setAttribute('data-letter', letter);
        key.onclick = () => addLetter(letter);
        keyboard.appendChild(key);
    });
    
    // Third row - PASS ZXCVBNM ⌫
    const passKey = document.createElement('button');
    passKey.className = 'key';
    passKey.textContent = 'PASS';
    passKey.setAttribute('data-letter', 'PASS');
    passKey.onclick = passWord;
    keyboard.appendChild(passKey);
    
    'ZXCVBNM'.split('').forEach(letter => {
        const key = document.createElement('button');
        key.className = 'key';
        key.textContent = letter;
        key.setAttribute('data-letter', letter);
        key.onclick = () => addLetter(letter);
        keyboard.appendChild(key);
    });
    
    const backspaceKey = document.createElement('button');
    backspaceKey.className = 'key';
    backspaceKey.textContent = '⌫';
    backspaceKey.setAttribute('data-letter', '⌫');
    backspaceKey.onclick = deleteLetter;
    keyboard.appendChild(backspaceKey);
}

function passWord() {
    // Prevent passing when on score screen
    if (gameState.currentCategory === 'score' || document.getElementById('wordInput').disabled) return;
    
    // Show pass prompt directly (same as when submitting empty word)
    updatePassMessage();
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

        // Handle pass confirmation
        if (gameState.showingPass) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('passYesBtn').click();
            } else if (e.key === 'Escape' || e.key === 'Backspace') {
                e.preventDefault();
                document.getElementById('passNoBtn').click();
            }
            return; // Exit early
        }

    // Handle next round button
    const nextRoundBtn = document.getElementById('nextRoundBtn');
    if (nextRoundBtn.style.display !== 'none' && e.key === 'Enter') {
        e.preventDefault();
        nextRoundBtn.click();
        return;
    }
        
        // Don't allow typing when on score category OR when input is disabled
        if (gameState.currentCategory === 'score' || document.getElementById('wordInput').disabled) return;
        
        // Handle key presses
        if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
            e.preventDefault();
            addLetter(e.key);
            validateInputRealTime();
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            deleteLetter();
            validateInputRealTime();
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

    if (!hasPlayedToday()) {
        stats = updateStats(currentScore);
    } else {
        stats = getStoredStats();
    }

    document.getElementById('pantsSolved').textContent = stats.pantsSolved;
    document.getElementById('currentStreak').textContent = stats.currentStreak;
    document.getElementById('bestStreak').textContent = stats.bestStreak;

    // Get the distribution values
    const dist20 = stats.scoreDistribution['20-24'];
    const dist10 = stats.scoreDistribution['10-19'];
    const dist0 = stats.scoreDistribution['0-9'];
    
    // Find the maximum value among the distributions
    const maxCount = Math.max(dist20, dist10, dist0);
    
    const dist20to24 = document.getElementById('dist20to24');
    const dist10to19 = document.getElementById('dist10to19');
    const dist0to9 = document.getElementById('dist0to9');

    // Set widths relative to the maxCount
    const maxWidth = 100; // Full width percentage for the highest count
    dist20to24.style.width = maxCount > 0 ? `${(dist20 / maxCount) * maxWidth}%` : '0%';
    dist10to19.style.width = maxCount > 0 ? `${(dist10 / maxCount) * maxWidth}%` : '0%';
    dist0to9.style.width = maxCount > 0 ? `${(dist0 / maxCount) * maxWidth}%` : '0%';

    // Update the text content
    dist20to24.textContent = dist20;
    dist10to19.textContent = dist10;
    dist0to9.textContent = dist0;

    document.getElementById('statsArea').style.display = 'block';
}

// Initialize the game
initGame();

// Pass button handlers
document.getElementById('passYesBtn').onclick = function() {
    // Add active class for visual feedback
    this.classList.add('active');
    setTimeout(() => {
        this.classList.remove('active');
    
    // User confirmed pass
    gameState.results[gameState.currentRound] = gameState.results[gameState.currentRound] || {};
    gameState.results[gameState.currentRound][gameState.currentCategory] = 'red';
    gameState.answers[gameState.currentRound] = gameState.answers[gameState.currentRound] || {};
    gameState.answers[gameState.currentRound][gameState.currentCategory] = '';

    // Save game state
    saveGameState();

    document.getElementById('passPrompt').style.display = 'none';
    gameState.showingPass = false;
    showInputSuccess('red', '');
    nextCategory();
    }, 100);
};

document.getElementById('passNoBtn').onclick = function() {
        // Add active class for visual feedback
    this.classList.add('active');
    setTimeout(() => {
        this.classList.remove('active');
    document.getElementById('passPrompt').style.display = 'none';
    gameState.showingPass = false;
    }, 100);
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
            'Commendable!', 'Triumphant!', 'Victorious!', 'Top-notch!', 'First-rate!',
            'High-five!', "You're a star!", 'Correct!', 'Right!', 'Yes!',
            'Optimal!', 'Champion!', 'Ace!', 'Ultimate!', 'Supremacy!', 'Insane!',
            'Pentakill!', 'M-M-M-Monster Kill!'
        ],
        yellow: [
            'Good word!', 'Nice try!', 'Not bad!', 'Good effort!',
            'Getting there!', 'Solid attempt!', 'Decent!','Fair enough!', 
            'Acceptable!', 'Respectable!', 'Competent!', 'Adequate!',
            'Satisfactory!', 'That works!', 'Making progress!',
            'Pretty good!', 'Reasonable!', 'Honorable mention!', 'Good enough!', 'Passed!',
            'Through!', 'Validated!', 'Confirmed!', 'Approved!', 'Got through!',
            'Achieved!', 'Secured!', 'Landed it!', 'Good outcome!', 'Acceptable result!',
            'Passed the mark!', 'Met expectations!', 'Got over the line!', 'Made it!'
        ],
        red: [
            'Next time!', 'Awww!', 'Oh no!', 'Not this time!', 'Unlucky!',
            'Better luck next time!', 'Missed it!', 'No dice!', 'Nope!',
            'Alas!', 'Hard luck!', 'Shucks!', 'Whoops!', 'Failed to connect!', 'Off target!',
            'Invalid!', 'Denied!', 'Out of luck!', 'No joy!', 'Fumble!',
            'Swing and a miss!', 'Not quite!', 'Just missed!',
            'Missed the mark!', 'No hit!', 'Slipped by!', 'Lost opportunity!', 
            'Almost had it!', 'Not this round!', 'Too bad!',
            'Better luck soon!', 'No cigar!', 'Didn\'t land!',
            'Unsuccessful!', 'Declined!', 'Rejected!', 'Did not pass!',
            'No go!', 'No score!', 'No completion!', 'A champion has been slain.'
        ]
    };
    
    // Show success message
    const messageArray = messages[result];
    const randomMessage = messageArray[Math.floor(Math.random() * messageArray.length)];
    input.value = '';
    input.placeholder = randomMessage;
    
    // Add success glow
    const glowClass = result === 'green' ? 'success-glow-green' : 
                    result === 'yellow' ? 'success-glow-yellow' : 'success-glow-red';
    inputContainer.classList.add(glowClass);
    
    // Remove glow and restore placeholder after animation
    setTimeout(() => {
        inputContainer.classList.remove(glowClass);
        input.placeholder = 'Type your answer...';
    }, 1500);
}

function updatePassMessage() {
    const categoryNames = {
        place: 'Place',
        animal: 'Animal',
        name: 'Name',
        thing: 'Thing'
    };
    
    const currentCategory = gameState.currentCategory;
    const currentLetter = gameState.letters[gameState.currentRound - 1];
    
    document.getElementById('currentCategoryText').textContent = categoryNames[currentCategory] || 'word';
    document.getElementById('currentLetterText').textContent = currentLetter;
}

const colorGradients = {
    blue: '#26405F',
    black: '#1a1a1a', 
    green: '#1b5333',
    red: '#661d1d',
    pink: '#5d1d5d',
    purple: '#361d66',
    yellow: '#66561d'
};

// Initialize color picker
const colorPickerButton = document.getElementById('colorPickerButton');
const colorPickerContainer = document.getElementById('colorPickerContainer');
let colorOptionsCreated = false;
let expanded = false;
let currentColor = 'blue';
let availableColors = ['black', 'green', 'red', 'pink', 'purple', 'yellow'];

function setInitialColor() {
  // Load from localStorage if available
  const savedColor = localStorage.getItem('pantsBackgroundColor');
  if (savedColor) {
    currentColor = savedColor;
  } else {
    currentColor = 'blue'; // Default color
  }
  
  // Remove current color from available options
  availableColors = ['blue', 'black', 'green', 'red', 'pink', 'purple', 'yellow']
    .filter(color => color !== currentColor);
    
  updateBackground(currentColor);
  colorPickerButton.style.background = colorGradients[currentColor];
}

// Create color options (only non-current colors)
function createColorOptions() {
    if (colorOptionsCreated) return;
    
    availableColors.forEach((color, index) => {
        const option = document.createElement('div');
        option.className = `color-option`;
        option.style.background = colorGradients[color];
        option.dataset.color = color;
        option.style.opacity = '0';
        option.style.transform = 'translateX(0) scale(0.8)'; // Start at center, slightly smaller
        colorPickerContainer.appendChild(option);
    });
    
    colorOptionsCreated = true;
}

// Expand color picker with horizontal sliding animation
function expandColorPicker() {
    if (expanded) return;
    expanded = true;
    createColorOptions();
    
    const options = document.querySelectorAll('.color-option');
    const spacing = 50;
    const leftPositions = [-3, -2, -1].map(pos => pos * spacing);
    const rightPositions = [1, 2, 3].map(pos => pos * spacing);
    const allPositions = [...leftPositions, ...rightPositions];
    
    // Force a reflow to ensure starting styles are applied
    requestAnimationFrame(() => {
        options.forEach((option, index) => {
            const xPosition = allPositions[index];
            option.style.setProperty('--option-x', `${xPosition}px`); // Store x position
            option.style.opacity = '1';
            option.style.transform = `translateX(${xPosition}px) scale(1)`;
        });
    });
}

// Collapse color picker with reverse animation
function collapseColorPicker() {
    if (!expanded) return; // Prevent multiple collapse calls
    expanded = false; // Set to false immediately
    
    const options = document.querySelectorAll('.color-option');
    
    options.forEach((option, index) => {
        option.style.opacity = '0';
        option.style.transform = 'translateX(0) scale(0.8)';
    });
    
    setTimeout(() => {
        // Only remove if still collapsed (prevents issues with quick clicks)
        if (!expanded && colorPickerContainer.querySelectorAll('.color-option').length > 0) {
            options.forEach(option => option.remove());
        }
        colorOptionsCreated = false;
    }, 1000);
}

// Update background
function updateBackground(color) {
    document.documentElement.style.setProperty('--main-gradient', colorGradients[color]);
}

function handleColorSelection(color) {
  // Add previous color back to available options
  availableColors.push(currentColor);
  // Remove selected color from available options
  availableColors = availableColors.filter(c => c !== color);
  
  // Update current color
  currentColor = color;
  
  updateBackground(currentColor);
  // Save to localStorage
  localStorage.setItem('pantsBackgroundColor', currentColor);
  colorPickerButton.style.background = colorGradients[currentColor];
  
  // Collapse picker
  collapseColorPicker();
}

// Event listeners
colorPickerButton.addEventListener('click', (e) => {
    e.stopPropagation();
    expanded ? collapseColorPicker() : expandColorPicker();
});

document.addEventListener('click', (e) => {
    if (!colorPickerContainer.contains(e.target)) {
        collapseColorPicker();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setInitialColor();
    
    // Add color option event listeners
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-option')) {
            const color = e.target.dataset.color;
            handleColorSelection(color);
        }
    });
});

function validateInputRealTime() {
    const input = document.getElementById('wordInput');
    const word = input.value.trim().toLowerCase();
    
    // Reset to default color
    input.classList.remove('valid-green', 'valid-yellow');
    
    // Don't validate if empty or on score category
    if (!word || gameState.currentCategory === 'score') {
        return;
    }
    
    const currentLetter = gameState.letters[gameState.currentRound - 1].toLowerCase();
    const criteria = gameState.criteria[gameState.currentRound][gameState.currentCategory];
    const category = gameState.currentCategory;
    
    // Must start with correct letter
    if (!word.startsWith(currentLetter)) {
        return; // Stay black
    }
    
    // Check if word is in category
    let wordFoundInCategory = false;
    const categoryData = window.dictionary[category];
    
    if (category === 'name' && criteria === vowelEndingCriteria.name) {
        for (const crit of allowedNameCriteria) {
            const words = getCriteriaWords(category, crit);
            if (words.includes(word) || (word.endsWith('s') && words.includes(word.slice(0, -1)))) {
                wordFoundInCategory = true;
                break;
            }
        }
    } else if (vowelEndingCriteria[category] && criteria === vowelEndingCriteria[category]) {
        if (categoryData) {
            for (const criteriaKey in categoryData) {
                if (criteriaKey === vowelEndingCriteria[category]) continue;
                const words = getCriteriaWords(category, criteriaKey);
                if (words.includes(word) || (word.endsWith('s') && words.includes(word.slice(0, -1)))) {
                    wordFoundInCategory = true;
                    break;
                }
            }
        }
    } else {
        if (categoryData) {
            for (const criteriaKey in categoryData) {
                const words = getCriteriaWords(category, criteriaKey);
                if (words.includes(word) || (word.endsWith('s') && words.includes(word.slice(0, -1)))) {
                    wordFoundInCategory = true;
                    break;
                }
            }
        }
    }
    
    if (!wordFoundInCategory) {
        return; // Stay black if not in category
    }
    
    // Check if matches criteria (for green vs yellow)
    let matchesCriteria = false;
    
    if (vowelEndingCriteria[category] && criteria === vowelEndingCriteria[category]) {
        const lastChar = word.charAt(word.length - 1).toLowerCase();
        matchesCriteria = ['a','e','i','o','u'].includes(lastChar);
    } else if (criteria === 'Letter Pattern') {
        const pattern = getPatternForRound(gameState.currentRound, gameState.currentCategory);
        matchesCriteria = checkWordAgainstPattern(word, pattern);
    } else {
        const criteriaWords = getCriteriaWords(category, criteria);
        if (criteriaWords.includes(word) || (word.endsWith('s') && criteriaWords.includes(word.slice(0, -1)))) {
            matchesCriteria = true;
        }
    }
    
    // Apply color
    if (matchesCriteria) {
        input.classList.add('valid-green');
    } else {
        input.classList.add('valid-yellow');
    }
}
