const CURRENT_VERSION = '0.0.8'; 
const DAILY_PUZZLE_VERSION = 1;

function checkVersion() {
    const savedVersion = localStorage.getItem('pantsVersion');
    
    if (savedVersion !== CURRENT_VERSION) {
        // Preserve stats while clearing game state
        const stats = localStorage.getItem('pantsGameStats');
        
        // If updating from version with 3 rounds, migrate the stats
        if (stats) {
            try {
                const parsedStats = JSON.parse(stats);
                
                // Check if we have individual game scores to migrate properly
                if (parsedStats.gamesPlayed && Object.keys(parsedStats.gamesPlayed).length > 0) {
                    // Reset distribution and recalculate from individual scores
                    const newDistribution = {
                        '9-10': 0,
                        '6-8': 0,
                        '5-7': 0,
                        '0-4': 0
                    };
                    
                    // Convert each game score from old system (0-24) to new system (0-10)
                    Object.values(parsedStats.gamesPlayed).forEach(oldScore => {
                        // Convert 24-point scale to 10-point scale
                        const newScore = Math.round((oldScore / 24) * 10);
                        
                        // Categorize into new ranges
                        if (newScore >= 9) {
                            newDistribution['9-10']++;
                        } else if (newScore >= 6) {
                            newDistribution['6-8']++;
                        } else if (newScore >= 5) {
                            newDistribution['5-7']++;
                        } else {
                            newDistribution['0-4']++;
                        }
                        
                        // Update the individual game score to new scale
                        const gameDate = Object.keys(parsedStats.gamesPlayed).find(
                            date => parsedStats.gamesPlayed[date] === oldScore
                        );
                        if (gameDate) {
                            parsedStats.gamesPlayed[gameDate] = newScore;
                        }
                    });
                    
                    parsedStats.scoreDistribution = newDistribution;
                } else {
                    // Fallback for users without individual game data
                    // Move scores from 10-19 range to new ranges
                    if (parsedStats.scoreDistribution && parsedStats.scoreDistribution['10-19']) {
                        const oldMidRange = parsedStats.scoreDistribution['10-19'];
                        // Split the old 10-19 range between new yellow (6-8) and orange (5-7)
                        parsedStats.scoreDistribution['6-8'] = (parsedStats.scoreDistribution['6-8'] || 0) + Math.ceil(oldMidRange * 0.7);
                        parsedStats.scoreDistribution['5-7'] = (parsedStats.scoreDistribution['5-7'] || 0) + Math.floor(oldMidRange * 0.3);
                        delete parsedStats.scoreDistribution['10-19'];
                    }
                    // Rename 20-24 to 9-10
                    if (parsedStats.scoreDistribution && parsedStats.scoreDistribution['20-24']) {
                        parsedStats.scoreDistribution['9-10'] = parsedStats.scoreDistribution['20-24'];
                        delete parsedStats.scoreDistribution['20-24'];
                    }
                    // Add missing ranges
                    if (!parsedStats.scoreDistribution['0-4']) {
                        parsedStats.scoreDistribution['0-4'] = parsedStats.scoreDistribution['0-9'] || 0;
                        delete parsedStats.scoreDistribution['0-9'];
                    }
                }
                
                localStorage.setItem('pantsGameStats', JSON.stringify(parsedStats));
            } catch (e) {
                console.log('Error migrating stats:', e);
            }
        }
        
        // Clear all game-related data except stats
        localStorage.removeItem('pantsGameState');
        
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

const allowedAnimalCriteria = [
    'Mammal', 
    'Aquatic', 
    'Flies or Glides', 
    'Cold Blooded', 
    'Warm Blooded', 
    'Carnivore', 
    'Herbivore',
    'Reptiles',
    'Insects'
];

const allowedPlaceCriteria = []; // Empty array means use all criteria
const allowedThingCriteria = []; // Empty array means use all criteria

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
    rerollsUsed: 0,
    totalScore: 0
};

// Add reroll function with point cost
function rerollCriteria() {
    const currentRound = gameState.currentRound;
    const currentCategory = gameState.currentCategory;
    
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

    // Deduct 1 point for reroll
    gameState.rerollsUsed++;
    
    // Show -1 animation
    showScoreAnimation(document.getElementById('rerollBtn'), -1, 'reroll');

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
        'Letter Pattern',
        'Venues of Entertainment',
        'Social Media Platform'
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
        'Terms of Endearment',
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
        'Alcoholic Drinks',
        'Brands with Animal Logos/Mascots',
        'Tree Nuts',
        'Cheese',
        'Social Media Platform',
        '_____ Pie'
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
        'Brands with Animal Logos/Mascots',
        'Tree Nuts',
        'Cheese',
        '_____ Pie'
        ],

};

// Initialize game with loading screen
async function initGame() {
    checkVersion();
    startLoadingScreen();
    setupWhatsNewScrollEffects();
    
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

function showScoreAnimation(categoryElement, points, type = 'normal') {
    const scoreText = type === 'reroll' ? '-1' : (points === 2 ? '+2' : points === 1 ? '+1' : '+0');
    const colorClass = type === 'reroll' ? 'red' : (points === 2 ? 'green' : points === 1 ? 'yellow' : 'red');
    
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
            currentRound: 1, // Always round 1 now
            currentCategory: savedGame.currentCategory,
            letters: savedGame.letters,
            criteria: savedGame.criteria,
            answers: savedGame.answers || {},
            results: savedGame.results || {},
            hasPlayed: savedGame.hasPlayed,
            rerollsUsed: savedGame.rerollsUsed || 0,
            totalScore: savedGame.totalScore || 0,
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
            const categoriesList = ['place', 'animal', 'name', 'thing'];
            const roundResults = gameState.results[1] || {};
            const roundComplete = categoriesList.every(cat => roundResults[cat]);
            
            if (roundComplete) {
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
        // New game - Initialize gameState properly first
        gameState = {
            currentRound: 1,
            currentCategory: 'place',
            letters: [],
            criteria: {},
            answers: {},
            results: {},
            hasPlayed: false,
            showingPass: false,
            rerollsUsed: 0,
            totalScore: 0
        };
        
        generateDailyPuzzle();
        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('countdown').style.display = 'none';
    }
    createKeyboard();
}

function generateDailyPuzzle() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    // Combine date with puzzle version for consistent seeding
    let seed = (year * 10000 + month * 100 + day) * DAILY_PUZZLE_VERSION;
    
    function seededRandom(s) {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    }

    // Generate criteria for the single round
    gameState.criteria[1] = {};
    
    // For each category, pick a criteria
    Object.keys(categories).forEach(category => {
        const availableCriteria = categories[category];
        
        const selectedCriteria = availableCriteria[
            Math.floor(seededRandom(seed + 100 + category.length) * availableCriteria.length)
        ];
        
        gameState.criteria[1][category] = selectedCriteria;
    });
    
    
// Check if dictionary is available for smart letter selection
    if (typeof dictionary !== 'undefined' && window.dictionary) {
        // Smart letter selection (your new logic)
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        gameState.letters = [];
        
        const roundCriteria = gameState.criteria[1];
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
        
        // Select a letter
        const letterIndex = Math.floor(seededRandom(seed + 1000) * lettersToChooseFrom.length);
        const selectedLetter = lettersToChooseFrom[letterIndex];
        
        gameState.letters.push(selectedLetter);

    } else {
        // Fallback to original random letter selection if dictionary not available
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const letter = alphabet[Math.floor(seededRandom(seed) * 26)];
        gameState.letters = [letter];
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
    // Update round info - always show "Round 1/1" or just "Round"
    const roundInfo = document.getElementById('roundInfo');
    roundInfo.textContent = 'Round 1/1';
    
    // Update letter square
    document.getElementById('letterSquare').textContent = gameState.letters[0];
    
    // Update criteria - special handling for Letter Pattern
    const currentCriteria = gameState.criteria[1][gameState.currentCategory];
    if (currentCriteria === 'Letter Pattern') {
        const pattern = getPatternForRound(1, gameState.currentCategory);
        document.getElementById('criteria').textContent = pattern.pattern;
    } else {
        document.getElementById('criteria').textContent = currentCriteria;
    }
    
    // Reset category selection - don't reset completed categories
    document.querySelectorAll('.category').forEach(cat => {
        cat.classList.remove('selected');
        
        if (cat.dataset.category === 'score') {
            cat.style.opacity = '1';
            cat.style.cursor = 'pointer';
            return;
        }
        
        // Check if this category is completed
        const isCompleted = gameState.results[1] && 
                          gameState.results[1][cat.dataset.category];
        
        if (isCompleted) {
            // Keep it completed and unclickable
            if (!cat.classList.contains('completed')) {
                cat.classList.add('completed');
                cat.classList.add(gameState.results[1][cat.dataset.category]);
            }
            cat.style.opacity = '0.8';
            cat.style.cursor = 'not-allowed';
        } else {
            // Make it available
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
            const isCompleted = gameState.results[1] && 
                              gameState.results[1][category];
            if (!isCompleted) {
                gameState.currentCategory = category;
                categoryElement.classList.add('selected');
                // Update criteria display for the new category
                const newCriteria = gameState.criteria[1][category];
                if (newCriteria === 'Letter Pattern') {
                    const pattern = getPatternForRound(1, category);
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

    // Always show reroll button (no longer limited per round)
    const rerollBtn = document.getElementById('rerollBtn');
    const isScoreCategory = gameState.currentCategory === 'score';
    const isCompletedCategory = gameState.results[1] && 
                               gameState.results[1][gameState.currentCategory];
    
    if (isScoreCategory || isCompletedCategory) {
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
    inputContainer.classList.remove('score-green', 'score-yellow', 'score-red', 'score-orange');
    pulseInputCircle(); 
    
    if (category === 'score') {
        const score = calculateTotalScore();
        input.value = '';
        input.placeholder = `${score}/10`;
        input.disabled = true;
        document.getElementById('criteria').textContent = 'Current Score';
        document.getElementById('submitBtn').style.display = 'none';
        
        // Remove all color classes first
        inputContainer.classList.remove('score-green', 'score-yellow', 'score-red', 'score-orange');
        
        // Add appropriate color class based on new score ranges
        if (score >= 9) {
            inputContainer.classList.add('score-green');
        } else if (score >= 6) {
            inputContainer.classList.add('score-yellow');
        } else if (score >= 5) {
            inputContainer.classList.add('score-orange');
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
    inputContainer.classList.remove('score-green', 'score-yellow', 'score-red', 'score-orange');
    input.placeholder = 'Type your answer...';
    input.disabled = false;
    document.getElementById('submitBtn').style.display = 'inline-block';
    
    // Check if category is already completed
    const categoryElement = document.querySelector(`[data-category="${category}"]`);
    const isCompleted = gameState.results[1] && 
                       gameState.results[1][category];
    
    if (isCompleted || categoryElement.classList.contains('completed')) {
        return; // Don't allow selection of completed categories
    }
    
    // For other categories, restore normal functionality
    input.placeholder = 'Type your answer...';
    input.disabled = false;
    document.getElementById('submitBtn').style.display = 'inline-block';
    
    // Always show reroll button for non-completed categories (no longer limited)
    const isCompletedCategory = gameState.results[1] && 
                               gameState.results[1][category];
    
    if (isCompletedCategory) {
        document.getElementById('rerollBtn').classList.add('hidden');
    } else {
        document.getElementById('rerollBtn').classList.remove('hidden');
    }
    
    gameState.currentCategory = category;
    document.querySelectorAll('.category').forEach(cat => cat.classList.remove('selected'));
    document.querySelector(`[data-category="${category}"]`).classList.add('selected');
    
    updateCategoryName();
    
    // Update criteria display - special handling for Letter Pattern
    const criteria = gameState.criteria[1][category];
    if (criteria === 'Letter Pattern') {
        const pattern = getPatternForRound(1, category);
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
    const currentLetter = gameState.letters[0].toLowerCase(); // Always first letter now
    const criteria = gameState.criteria[1][gameState.currentCategory];
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
        showInputError(`Word must start with ${gameState.letters[0]}`);
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
        const pattern = getPatternForRound(1, gameState.currentCategory);
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
    gameState.results[1] = gameState.results[1] || {};
    gameState.results[1][category] = result;
    gameState.answers[1] = gameState.answers[1] || {};
    gameState.answers[1][category] = word;

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
   
   // Create a seed based on round, category, and the daily puzzle version for consistency
   const today = new Date();
   const year = today.getFullYear();
   const month = today.getMonth() + 1;
   const day = today.getDate();
   const seed = (year * 10000 + month * 100 + day) * DAILY_PUZZLE_VERSION + round * 100 + category.length;
   
   function seededRandom(s) {
       const x = Math.sin(s) * 10000;
       return x - Math.floor(x);
   }
   
   // Pick a seeded random word from valid 5-letter words
   const randomIndex = Math.floor(seededRandom(seed) * validWords.length);
   const randomWord = validWords[randomIndex];
   
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
   
   // Pick a seeded random consonant from the word
   const consonantIndex = Math.floor(seededRandom(seed + 1) * consonants.length);
   const selectedConsonant = consonants[consonantIndex];
   
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

// Helper function to get allowed criteria for a category
function getAllowedCriteriaForCategory(category) {
    switch (category) {
        case 'name':
            return allowedNameCriteria;
        case 'animal':
            return allowedAnimalCriteria;
        case 'place':
            return allowedPlaceCriteria.length > 0 ? allowedPlaceCriteria : null; // null means use all
        case 'thing':
            return allowedThingCriteria.length > 0 ? allowedThingCriteria : null; // null means use all
        default:
            return null;
    }
}

function getCriteriaWords(category, criteria) {
    const categoryData = window.dictionary[category];
    if (!categoryData) return [];
    
    // Handle letter pattern criteria with specific allowed criteria
    if (criteria === 'Letter Pattern') {
        const allowedCriteria = getAllowedCriteriaForCategory(category);
        const allWords = [];
        
        if (allowedCriteria) {
            // Use only the allowed criteria for this category
            allowedCriteria.forEach(crit => {
                // Skip vowel criteria and shared criteria references
                if (crit === vowelEndingCriteria[category] || 
                    (typeof categoryData[crit] === 'string' && categoryData[crit].startsWith('@sharedCriteria.'))) {
                    return;
                }
                
                const words = getCriteriaWordsHelper(category, crit);
                allWords.push(...words);
            });
        } else {
            // Use all criteria for this category (existing behavior for place/thing)
            for (const crit in categoryData) {
                // Skip shared criteria references and vowel criteria
                if (crit === vowelEndingCriteria[category] || 
                    (typeof categoryData[crit] === 'string' && categoryData[crit].startsWith('@sharedCriteria.'))) {
                    continue;
                }
                
                const words = getCriteriaWordsHelper(category, crit);
                allWords.push(...words);
            }
        }
        
        return [...new Set(allWords)]; // Remove duplicates
    }
    
    // Handle other criteria normally
    return getCriteriaWordsHelper(category, criteria);
}

// Helper function to get words for a specific criteria (extracted from original getCriteriaWords)
function getCriteriaWordsHelper(category, criteria) {
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
                const words = getCriteriaWordsHelper(category, crit);
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
                
                const words = getCriteriaWordsHelper(category, crit);
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
    
    // Update category square color with flip animation
    const categorySquare = document.querySelector(`[data-category="${gameState.currentCategory}"]`);
    const result = gameState.results[1][gameState.currentCategory];

    // Add flip animation
    categorySquare.classList.add('flipping');

    // After the flip animation completes, add the final colors
    setTimeout(() => {
        categorySquare.classList.add('completed', result);
        categorySquare.classList.remove('flipping');
        
        // Show score animation after flip completes
        const points = result === 'green' ? 2 : result === 'yellow' ? 1 : 0;
        showScoreAnimation(categorySquare, points);
    }, 600); // Match the animation duration
        
    // Check if all categories are completed
    const currentRoundResults = gameState.results[1] || {};
    const allCategoriesCompleted = categories.every(cat => currentRoundResults[cat]);
    
    if (allCategoriesCompleted) {
        // Game complete
        endGame();
    } else {
        // Move to next incomplete category
        const nextCategory = categories.find(cat => !currentRoundResults[cat]);
        
        if (nextCategory) {
            gameState.currentCategory = nextCategory;
            updateGameDisplay();
        }
    }
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
    
    // Show the 4 category results + 1 score square
    categories.forEach(category => {
        const square = document.createElement('div');
        square.className = `result-square ${gameState.results[1][category]}`;
        
        const scores = { green: 2, yellow: 1, red: 0 };
        totalScore += scores[gameState.results[1][category]];
        
        resultGrid.appendChild(square);
    });
    
    // Add the final score square with appropriate color
    const scoreSquare = document.createElement('div');
    const finalScore = totalScore - gameState.rerollsUsed; // Subtract reroll costs
    
    if (finalScore >= 9) {
        scoreSquare.className = 'result-square green';
    } else if (finalScore >= 6) {
        scoreSquare.className = 'result-square yellow';
    } else if (finalScore >= 5) {
        scoreSquare.className = 'result-square orange';
    } else {
        scoreSquare.className = 'result-square red';
    }
    resultGrid.appendChild(scoreSquare);
    
    document.getElementById('finalScore').textContent = `Score: ${finalScore}/10`;
    
    // Enable scrolling for results screen
    document.documentElement.classList.add('results-view');
    document.body.classList.add('results-view');
    document.querySelector('.container').classList.add('results-view');
    
    // Show score breakdown section instead of round details
    document.getElementById('roundDetailsArea').style.display = 'block';
    
    // Initialize score breakdown
    setupScoreBreakdown();
}

function setupScoreBreakdown() {
    // Hide round selector buttons since we only have one round
    document.querySelector('.round-selector').style.display = 'none';
    
    // Change the header
    document.querySelector('#roundDetailsArea .stats-header').textContent = 'Score Breakdown';
    
    // Show score details
    showScoreDetails();
}

function showScoreDetails() {
    const roundContent = document.getElementById('roundContent');
    const letter = gameState.letters[0];
    const categories = ['place', 'animal', 'name', 'thing'];
    
    let html = `<div class="round-letter">Letter: ${letter}</div>`;
    
    categories.forEach(category => {
        const criteria = gameState.criteria[1][category];
        const userAnswer = gameState.answers[1] && gameState.answers[1][category] 
            ? gameState.answers[1][category] 
            : 'Passed';
        
        // Get the result for this category
        const result = gameState.results[1][category] || 'red';
        
        // Calculate points earned for this answer
        const pointsEarned = result === 'green' ? 2 : result === 'yellow' ? 1 : 0;
        const pointsColor = result === 'green' ? 'green' : result === 'yellow' ? 'yellow' : 'red';
        
        // Get possible answers
        let allValidWords = [];
        const words = getCriteriaWords(category, criteria);
        
        if (criteria === 'Letter Pattern') {
            const pattern = getPatternForRound(1, category);
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
                    getPatternForRound(1, category).pattern : criteria}</div>
                <div class="user-answer">Your answer: <strong class="${result}">${userAnswer}</strong> <strong class="${pointsColor}">+${pointsEarned}</strong></div>
                <div class="possible-answers">
                    ${possibleAnswersText}
                </div>
            </div>
        `;
    });
    
    // Add score and rerolls summary
    const totalEarned = calculateTotalScore();
    const finalScore = totalEarned - gameState.rerollsUsed;
    const rerollBonus = gameState.rerollsUsed === 0 ? 2 : 0;
    
    html += `
        <div class="category-detail">
            <div class="category-title">Score: ${finalScore}/10</div>
            <div class="possible-answers">Rerolls used: ${gameState.rerollsUsed} <strong class="${gameState.rerollsUsed === 0 ? 'green' : 'red'}">+${rerollBonus} points</strong></div>
        </div>
    `;
    
    roundContent.innerHTML = html;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
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
    
    // Show the 4 category results
    categories.forEach(category => {
        const result = gameState.results[1][category];
        const emoji = { green: '🟩', yellow: '🟨', red: '🟥' };
        shareText += emoji[result];
    });
    
    // Add the final score square
    const totalScore = calculateTotalScore() - gameState.rerollsUsed;
    let scoreEmoji;
    if (totalScore >= 9) {
        scoreEmoji = '🟩';
    } else if (totalScore >= 6) {
        scoreEmoji = '🟨';
    } else if (totalScore >= 5) {
        scoreEmoji = '🟧'; // Orange square
    } else {
        scoreEmoji = '🟥';
    }
    shareText += scoreEmoji;
    shareText += '\n';
    
    shareText += `Score: ${totalScore}/10`;
    
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

// About Modal
document.getElementById('aboutBtn').onclick = () => {
    document.getElementById('aboutModal').style.display = 'flex';
};

document.getElementById('closeAbout').onclick = () => {
    document.getElementById('aboutModal').style.display = 'none';
};

document.getElementById('aboutModal').onclick = (e) => {
    if (e.target === document.getElementById('aboutModal')) {
        document.getElementById('aboutModal').style.display = 'none';
    }
};

// Business Modal
document.getElementById('businessBtn').onclick = () => {
    document.getElementById('businessModal').style.display = 'flex';
};

document.getElementById('closeBusiness').onclick = () => {
    document.getElementById('businessModal').style.display = 'none';
};

document.getElementById('businessModal').onclick = (e) => {
    if (e.target === document.getElementById('businessModal')) {
        document.getElementById('businessModal').style.display = 'none';
    }
};

// Privacy Modal
document.getElementById('privacyBtn').onclick = () => {
    document.getElementById('privacyModal').style.display = 'flex';
};

document.getElementById('closePrivacy').onclick = () => {
    document.getElementById('privacyModal').style.display = 'none';
};

document.getElementById('privacyModal').onclick = (e) => {
    if (e.target === document.getElementById('privacyModal')) {
        document.getElementById('privacyModal').style.display = 'none';
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
    
    const roundResults = gameState.results[1] || {};
    categories.forEach(category => {
        const result = roundResults[category];
        if (result) {
            total += scores[result];
        }
    });
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
            '9-10': 0,
            '6-8': 0,
            '5-7': 0,
            '0-4': 0
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
        totalScore: gameState.totalScore,
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
        rerollsUsed: gameState.rerollsUsed,
        totalScore: gameState.totalScore,
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
    
    // Update score distribution with new ranges
    if (currentScore >= 9) {
        stats.scoreDistribution['9-10']++;
    } else if (currentScore >= 6) {
        stats.scoreDistribution['6-8']++;
    } else if (currentScore >= 5) {
        stats.scoreDistribution['5-7']++;
    } else {
        stats.scoreDistribution['0-4']++;
    }
    
    // Count every completed game as "Pants Solved" regardless of score
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
    const currentScore = calculateTotalScore() - gameState.rerollsUsed;
    let stats;

    if (!hasPlayedToday()) {
        stats = updateStats(currentScore);
    } else {
        stats = getStoredStats();
    }

    document.getElementById('pantsSolved').textContent = stats.pantsSolved;
    document.getElementById('currentStreak').textContent = stats.currentStreak;
    document.getElementById('bestStreak').textContent = stats.bestStreak;

    // Get the distribution values with new ranges
    const dist9 = stats.scoreDistribution['9-10'];
    const dist6 = stats.scoreDistribution['6-8'];
    const dist5 = stats.scoreDistribution['5-7'];
    const dist0 = stats.scoreDistribution['0-4'];
    
    // Find the maximum value among the distributions
    const maxCount = Math.max(dist9, dist6, dist5, dist0);
    
    const dist9to10 = document.getElementById('dist20to24'); // Reusing existing element
    const dist6to8 = document.getElementById('dist10to19'); // Reusing existing element
    const dist5to7 = document.getElementById('dist0to9'); // Reusing existing element for 5-7
    
    // Update the labels in HTML to match new ranges
    document.querySelector('.distribution-row:nth-child(2) .distribution-label').textContent = '9-10';
    document.querySelector('.distribution-row:nth-child(3) .distribution-label').textContent = '6-8';
    document.querySelector('.distribution-row:nth-child(4) .distribution-label').textContent = '5-7';
    
    // Update the existing third row to be orange instead of red
    dist5to7.className = 'distribution-bar orange';

    // Set widths relative to the maxCount
    const maxWidth = 100; // Full width percentage for the highest count
    dist9to10.style.width = maxCount > 0 ? `${(dist9 / maxCount) * maxWidth}%` : '0%';
    dist6to8.style.width = maxCount > 0 ? `${(dist6 / maxCount) * maxWidth}%` : '0%';
    dist5to7.style.width = maxCount > 0 ? `${(dist5 / maxCount) * maxWidth}%` : '0%';

    // Update the text content
    dist9to10.textContent = dist9;
    dist6to8.textContent = dist6;
    dist5to7.textContent = dist5;

    // Update the fourth row (which was originally the 0-9 row) to be 0-4
    const distributionRows = document.querySelectorAll('.distribution-row');
    if (distributionRows.length >= 4) {
        const fourthRow = distributionRows[3]; // 0-based index, so 4th row
        const fourthLabel = fourthRow.querySelector('.distribution-label');
        const fourthBar = fourthRow.querySelector('.distribution-bar');
        
        if (fourthLabel) fourthLabel.textContent = '0-4';
        if (fourthBar) {
            fourthBar.className = 'distribution-bar red';
            fourthBar.style.width = maxCount > 0 ? `${(dist0 / maxCount) * maxWidth}%` : '0%';
            fourthBar.textContent = dist0;
        }
    }

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
    gameState.results[1] = gameState.results[1] || {};
    gameState.results[1][gameState.currentCategory] = 'red';
    gameState.answers[1] = gameState.answers[1] || {};
    gameState.answers[1][gameState.currentCategory] = '';

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
        { selector: '.criteria', text: 'Subcategory' },
        { selector: '#rerollBtn', text: 'Rerolls subcategory. Costs 1 point each use' },
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
            'Pentakill!', 'M-M-M-Monster Kill!','Legendary!', 'You crushed it!',
            'Sharp as ever!', 'Big brain!', 'Mind-blowing!', 'Flames!',
            'Power play!', 'Elite!', 'Calculated!', 'Too clean!', 'Correctamundo!',
            'Cracked!', 'Wizardry!'
        ],
        yellow: [
            'Good word!', 'Nice try!', 'Not bad!', 'Good effort!',
            'Getting there!', 'Solid attempt!', 'Decent!','Fair enough!', 
            'Acceptable!', 'Respectable!', 'Competent!', 'Adequate!',
            'Satisfactory!', 'That works!', 'Making progress!',
            'Pretty good!', 'Reasonable!', 'Honorable mention!', 'Good enough!', 'Passed!',
            'Through!', 'Validated!', 'Confirmed!', 'Approved!', 'Got through!',
            'Achieved!', 'Secured!', 'Landed it!', 'Good outcome!', 'Acceptable result!',
            'Passed the mark!', 'Met expectations!', 'Got over the line!', 'Made it!',
            'That\'ll do!', 'It works!','Close one!', 'Made the cut!', 'On the board!', 'Counts!',
            'Squeaked by!','Viable!','We\'ll take it!','Border pass!','All clear!',
            'Made it work!','Snuck in!','We count that!'
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
            'No go!', 'No score!', 'No completion!', 'A champion has been slain.',
            'No good!', 'Negative!', 'That\'s a miss!', '404: Answer not found!',
            'Eliminated!', 'Null input!', 'Misfire!',
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
    const currentLetter = gameState.letters[0]; // Always first letter now
    
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
    
    const currentLetter = gameState.letters[0].toLowerCase(); // Always first letter now
    const criteria = gameState.criteria[1][gameState.currentCategory];
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
        const pattern = getPatternForRound(1, gameState.currentCategory);
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

// What's New scroll fade effects
function setupWhatsNewScrollEffects() {
    const content = document.getElementById('whatsNewContent');
    const fadeTop = document.getElementById('fadeTop');
    const fadeBottom = document.getElementById('fadeBottom');
    
    if (!content || !fadeTop || !fadeBottom) return;
    
    function updateFadeEffects() {
        const scrollTop = content.scrollTop;
        const scrollHeight = content.scrollHeight;
        const clientHeight = content.clientHeight;
        const scrollBottom = scrollHeight - clientHeight - scrollTop;
        
        // Fade top based on scroll position
        fadeTop.style.opacity = scrollTop > 10 ? '1' : '0';
        
        // Fade bottom based on remaining scroll
        fadeBottom.style.opacity = scrollBottom > 10 ? '1' : '0';
    }
    
    content.addEventListener('scroll', updateFadeEffects);
    
    // Initial check
    updateFadeEffects();
}

// Call this function after the page loads
document.addEventListener('DOMContentLoaded', () => {
    setupWhatsNewScrollEffects();
});
