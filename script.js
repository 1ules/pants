// Fix for mobile viewport height
function adjustViewport() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

window.addEventListener('resize', adjustViewport);
window.addEventListener('load', adjustViewport);
adjustViewport();

// Game state
let gameState = {
    currentRound: 1,
    currentCategory: 'place',
    letters: [],
    criteria: {},
    answers: {},
    results: {},
    hasPlayed: false,
    showingPass: false
};

function goHome() {
    // Hide all game areas
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('resultsArea').style.display = 'none';
    document.getElementById('statsArea').style.display = 'none';
    
    // Show start area
    document.getElementById('startArea').style.display = 'block';
    
    // Hide home button
    document.getElementById('homeBtn').style.display = 'none';
    
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
    place: ['Located in Europe', 'Located in Asia', 'Located in the USA', 'Located in Australia', 'Island or Archipelago', 'Ends with a Vowel','Capital City'],
    animal: ['4 Legs or More', 'Mammal', 'Lives in Water', 'Flies', 'Cold Blooded', 'Warm Blooded', 'Carnivore', 'Herbivore', 'Fictional and Mythological Creatures'],
    name: ['Unisex', 'Biblical Names','Three Letter Names', 'Names Ending with Vowels', 'Names from Mythology', 'Indian Names', 'Japanese Names', 'Male Names', 'Female Names'],
    thing: ['Things Made of Metal', 'Common household items', 'Food', 'Found in Nature', 'Used in School','Used in Sports','Found in a Toolbox','Used in the Kitchen', 'Liquids', 'Technology & Equipment', 'Clothing & Accessories']
};

// Initialize game with loading screen
async function initGame() {
    // Start the loading process
    startLoadingScreen();
    
    // Load dictionary while showing loading screen
    try {
        const response = await fetch('dictionary.json');
        window.dictionary = await response.json();
        console.log('Dictionary loaded successfully');
    } catch (error) {
        console.error('Failed to load dictionary:', error);
        // Fallback - you could set a basic dictionary or show error
        window.dictionary = {};
    }
}

function startLoadingScreen() {
    let progress = 0;
    const zipperPull = document.getElementById('zipperPull');
    const zipperOpened = document.getElementById('zipperOpened');
    const loadingPercentage = document.getElementById('loadingPercentage');
    
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15 + 5; // Random increment between 5-20
        
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
        }
        
        // Update zipper position and opening
        const pullPosition = (progress / 100) * 370; // 370px is roughly the container width minus pull width
        zipperPull.style.left = pullPosition + 'px';
        zipperOpened.style.width = progress + '%';
        
        // Show percentage once zipper starts opening
        if (progress > 10) {
            loadingPercentage.style.opacity = '1';
        }
        
        loadingPercentage.textContent = Math.floor(progress) + '%';
        
        // Complete loading
        if (progress >= 100) {
            setTimeout(() => {
                completeLoading();
            }, 500); // Small delay to show 100%
        }
    }, 100); // Update every 100ms
}

function completeLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    
    // Fade out loading screen
    loadingScreen.style.transition = 'opacity 0.5s ease-out';
    loadingScreen.style.opacity = '0';
    
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        
        // Initialize the actual game
        initializeGameLogic();
    }, 500);
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
            showingPass: false
        };
        
        if (savedGame.isComplete) {
            // Game is complete, show results
            document.getElementById('startArea').style.display = 'none';
            document.getElementById('gameArea').style.display = 'none';
            document.getElementById('resultsArea').style.display = 'block';
             document.getElementById('homeBtn').style.display = 'block'; 
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
                updateGameDisplay();
            }
        }
    } else {
        // New game
        generateDailyPuzzle();
    }
    
    setupEventListeners();
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
    
    // First, generate criteria for each round using seeded random
    for (let i = 1; i <= 3; i++) {
        gameState.criteria[i] = {
            place: categories.place[Math.floor(seededRandom(seed + i * 100) * categories.place.length)],
            animal: categories.animal[Math.floor(seededRandom(seed + i * 200) * categories.animal.length)],
            name: categories.name[Math.floor(seededRandom(seed + i * 300) * categories.name.length)],
            thing: categories.thing[Math.floor(seededRandom(seed + i * 400) * categories.thing.length)]
        };
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
                
                // Check place category
                const placeWords = window.dictionary.place?.[roundCriteria.place] || [];
                const hasPlace = placeWords.some(word => word.startsWith(lowerLetter));
                
                // Check animal category
                const animalWords = window.dictionary.animal?.[roundCriteria.animal] || [];
                const hasAnimal = animalWords.some(word => word.startsWith(lowerLetter));
                
                // Check thing category
                const thingWords = window.dictionary.thing?.[roundCriteria.thing] || [];
                const hasThing = thingWords.some(word => word.startsWith(lowerLetter));
                
                // For name category, check if there are names starting with this letter
                const nameWords = window.dictionary.name?.[roundCriteria.name] || [];
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
    document.getElementById('errorMessage').textContent = '';
    document.getElementById('passPrompt').style.display = 'none';
    gameState.showingPass = false;

    // Ensure input is enabled and submit button is visible for game categories
    document.getElementById('wordInput').disabled = false;
    document.getElementById('submitBtn').style.display = 'inline-block';
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
    
    if (gameState.showingPass) {
        return;
    }

    if (!word) {
        // Show pass prompt
        gameState.showingPass = true;
        document.getElementById('passPrompt').style.display = 'block';
        return;
    }
    
    // Validate word
    let result = 'red';
    let errorMessage = '';
    
    // 1. Check if word starts with correct letter
    if (!word.startsWith(currentLetter)) {
        errorMessage = `Word must start with ${gameState.letters[gameState.currentRound - 1]}`;
        document.getElementById('errorMessage').textContent = errorMessage;
        setTimeout(() => {
            document.getElementById('errorMessage').textContent = '';
        }, 2000);
        return;
    }
    
    // 2. Check if word is in category at all
    const categoryData = window.dictionary[gameState.currentCategory];
    let wordFoundInCategory = false;

    if (categoryData) {
        // Search through all criteria arrays in the category
        for (const criteriaKey in categoryData) {
            if (Array.isArray(categoryData[criteriaKey]) && categoryData[criteriaKey].includes(word)) {
                wordFoundInCategory = true;
                break;
            }
        }
    }

    if (!wordFoundInCategory) {
        errorMessage = `That ${gameState.currentCategory} isn't in the dictionary yet, try another ${gameState.currentCategory.toLowerCase()}.`;
        document.getElementById('errorMessage').textContent = errorMessage;
        setTimeout(() => {
            document.getElementById('errorMessage').textContent = '';
        }, 2000);
        return;
    }
    
    // 3. Check if word matches specific criteria (for green score)
    const criteriaWords = window.dictionary[gameState.currentCategory]?.[criteria] || [];

    // Add the debug logs here:
console.log('Current criteria:', criteria);
console.log('Criteria words:', criteriaWords);
console.log('Submitted word:', word);
console.log('Word in criteria?', criteriaWords.includes(word));

    if (criteriaWords.includes(word)) {
        result = 'green'; // Perfect match
    } else {
        result = 'yellow'; // Right category but wrong criteria
    }
    
    // Store result
    gameState.results[gameState.currentRound] = gameState.results[gameState.currentRound] || {};
    gameState.results[gameState.currentRound][gameState.currentCategory] = result;
    gameState.answers[gameState.currentRound] = gameState.answers[gameState.currentRound] || {};
    gameState.answers[gameState.currentRound][gameState.currentCategory] = word;

    // Save game state
    saveGameState();
    
    // Clear input and errors
    document.getElementById('wordInput').value = '';
    document.getElementById('errorMessage').textContent = '';
    
    nextCategory();
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
    
    updateGameDisplay();

    saveGameState();
}

function endGame() {
    // Mark game as complete
    markGameComplete();
    
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('resultsArea').style.display = 'block';
    document.getElementById('homeBtn').style.display = 'none';
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
    
    // Try modern clipboard API first, fall back to older method
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Results copied to clipboard!');
        }).catch(() => {
            // Fallback method
            fallbackCopyToClipboard(shareText);
        });
    } else {
        fallbackCopyToClipboard(shareText);
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
    const rows = [
        'QWERTYUIOP',
        'ASDFGHJKL',
        'ZXCVBNM'
    ];
    
    rows.forEach((row, rowIndex) => {
        row.split('').forEach(letter => {
            const key = document.createElement('button');
            key.className = 'key';
            key.textContent = letter;
            key.onclick = () => addLetter(letter);
            keyboard.appendChild(key);
        });
        
        if (rowIndex === 2) {
            const backspaceKey = document.createElement('button');
            backspaceKey.className = 'key wide';
            backspaceKey.textContent = 'BACK';
            backspaceKey.onclick = deleteLetter;
            keyboard.appendChild(backspaceKey);
            
            const clearKey = document.createElement('button');
            clearKey.className = 'key wide';
            clearKey.textContent = 'CLEAR';
            clearKey.onclick = clearInput;
            keyboard.appendChild(clearKey);
        }
    });
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
