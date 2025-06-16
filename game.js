// Constants
const BOARD_SIZE = 8;
const TYPES = {
  // Normale tegels
  brood: 'brood.png',
  cracker: 'cracker.png',
  lavendel: 'lavendel.png',
  paturain: 'paturainnaturel.png',
  
  // Speciale tegels
  exploderende_kaas: 'exploderende_kaas.png',
  borrelplank_booster: 'borrelplank_booster.png',
  
  // Power-ups
  horizontaal: 'horizontaal.png',
  verticaal: 'verticaal.png',
  explosie: 'explosie.png',
  verwijder_alle: 'verwijder_alle.png'
};

// Points system
const POINTS = {
  // Normale matches
  normaal: 30,
  
  // Speciale matches
  exploderende_kaas: 50,
  borrelplank_booster: 100,
  
  // Power-ups
  horizontaal: 150,
  verticaal: 150,
  explosie: 200,
  verwijder_alle: 300,
  
  // Chain reaction bonus
  chain_bonus: 50
};

let board = [];
let score = 0;
let selectedTile = null;
let timer = null;
let isGameOver = false;
let timeLeft = 60;
let isCooldown = false; // Add cooldown state
let isProcessingMatches = false; // Voegt state toe om te controleren of matches worden verwerkt
const COOLDOWN_TIME = 500; // 0.5 seconds in milliseconds

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Start direct initialisatie
    initializeGame();
    
    // Voeg klik handler toe voor nieuw spel knop
    document.getElementById('new-game').addEventListener('click', () => {
        startGame();
    });

    // Voeg klik handler toe voor verstuur knop
    document.getElementById('submit-score').addEventListener('click', () => {
        if (score > 0) {
            // Toon het game over formulier
            document.getElementById('game-over-form').classList.remove('hidden');
            document.getElementById('player-score').value = score;
        }
    });
});

// Initialize game
function initializeGame() {
    // Reset timer
    clearInterval(timer);
    timeLeft = 60;
    document.getElementById('timer').textContent = timeLeft;
    
    // Start timer
    startTimer();
    
    // Initializeer board en score
    initializeBoard();
    document.getElementById('score').textContent = score;
    
    // Start game
    startGame();
}

// Initialize board
function initializeBoard() {
    board = [];
    // Maak een array van alle normale tegel types
    const normalTypes = Object.keys(TYPES).filter(type => 
        !['exploderende_kaas', 'borrelplank_booster', 'horizontaal', 'verticaal', 'explosie', 'verwijder_alle'].includes(type)
    );
    
    // Maak een array van alle mogelijke types
    const allTypes = Object.keys(TYPES);
    
    for (let i = 0; i < BOARD_SIZE; i++) {
        board[i] = [];
        for (let j = 0; j < BOARD_SIZE; j++) {
            // Kies een random type uit de normale types
            const randomType = normalTypes[Math.floor(Math.random() * normalTypes.length)];
            board[i][j] = randomType;
        }
    }
    
    // Controleer of er geen matches zijn
    let hasMatches = true;
    while (hasMatches) {
        hasMatches = false;
        const matches = findMatches();
        if (matches.normal.length > 0 || matches.special.length > 0) {
            hasMatches = true;
            // Herinitialiseer de rijen waar matches zijn gevonden
            matches.normal.forEach(([r, c]) => {
                board[r][c] = normalTypes[Math.floor(Math.random() * normalTypes.length)];
            });
            matches.special.forEach(match => {
                const [r, c] = match.position;
                board[r][c] = normalTypes[Math.floor(Math.random() * normalTypes.length)];
            });
        }
    }
    
    createBoard();
}

// Create board
function createBoard() {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = '';
    
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.row = i;
            tile.dataset.col = j;
            tile.style.backgroundImage = `url('${TYPES[board[i][j]]}')`;
            tile.style.backgroundSize = 'contain';
            tile.style.backgroundRepeat = 'no-repeat';
            tile.style.backgroundPosition = 'center';
            
            // Voeg een data-type attribuut toe voor debugging
            tile.dataset.type = board[i][j];
            
            tile.addEventListener('click', handleTileClick);
            boardElement.appendChild(tile);
        }
    }
}

// Generate new tile
function generateNewTile() {
    // Maak een array van alle normale tegel types
    const normalTypes = Object.keys(TYPES).filter(type => 
        !['exploderende_kaas', 'borrelplank_booster', 'horizontaal', 'verticaal', 'explosie', 'verwijder_alle'].includes(type)
    );
    
    // Zorg ervoor dat we altijd een geldig type krijgen
    const type = normalTypes[Math.floor(Math.random() * normalTypes.length)];
    if (!type) {
        console.error('Geen geldig type gevonden');
        return 'brood'; // Default naar brood als fallback
    }
    return type;
}

// Swap tiles
function swapTiles(board, r1, c1, r2, c2) {
    const temp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = temp;
}

// Find matches
function findMatches() {
    const matches = [];
    const specialMatches = [];
    
    // Check horizontal matches
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE - 2; j++) {
            if (board[i][j] && board[i][j] === board[i][j + 1] && board[i][j] === board[i][j + 2]) {
                matches.push([i, j], [i, j + 1], [i, j + 2]);
                
                // Check for special matches
                if (j < BOARD_SIZE - 3 && board[i][j] === board[i][j + 3]) {
                    specialMatches.push({
                        type: 'exploderende_kaas',
                        position: [i, j + 1]
                    });
                }
                
                // Check for L/T shape
                if (i > 0 && board[i - 1][j] === board[i][j]) {
                    specialMatches.push({
                        type: 'borrelplank_booster',
                        position: [i, j + 1]
                    });
                }
                if (i < BOARD_SIZE - 1 && board[i + 1][j] === board[i][j]) {
                    specialMatches.push({
                        type: 'borrelplank_booster',
                        position: [i, j + 1]
                    });
                }
            }
        }
    }
    
    // Check vertical matches
    for (let j = 0; j < BOARD_SIZE; j++) {
        for (let i = 0; i < BOARD_SIZE - 2; i++) {
            if (board[i][j] && board[i][j] === board[i + 1][j] && board[i][j] === board[i + 2][j]) {
                matches.push([i, j], [i + 1, j], [i + 2, j]);
                
                // Check for special matches
                if (i < BOARD_SIZE - 3 && board[i][j] === board[i + 3][j]) {
                    specialMatches.push({
                        type: 'exploderende_kaas',
                        position: [i + 1, j]
                    });
                }
                
                // Check for L/T shape
                if (j > 0 && board[i][j - 1] === board[i][j]) {
                    specialMatches.push({
                        type: 'borrelplank_booster',
                        position: [i + 1, j]
                    });
                }
                if (j < BOARD_SIZE - 1 && board[i][j + 1] === board[i][j]) {
                    specialMatches.push({
                        type: 'borrelplank_booster',
                        position: [i + 1, j]
                    });
                }
            }
        }
    }
    
    // Remove duplicates
    const uniqueMatches = Array.from(new Set(matches.map(JSON.stringify)), JSON.parse);
    
    return {
        normal: uniqueMatches,
        special: specialMatches
    };
}

// Process matches
function processMatches() {
    const matchResult = findMatches();
    const matches = matchResult.normal;
    const specialMatches = matchResult.special;
    
    if (matches.length === 0 && specialMatches.length === 0) {
        return;
    }

    // Handle special matches first
    specialMatches.forEach(match => {
        const [r, c] = match.position;
        board[r][c] = match.type;
    });

    // Highlight normal matches
    matches.forEach(([r, c]) => {
        const tile = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        tile.classList.add('match');
    });

    // Calculate score
    const uniqueMatches = new Set(matches.map(([r, c]) => `${r},${c}`));
    const matchCount = uniqueMatches.size;
    
    // Score based on match type
    if (matchCount >= 3) {
        score += matchCount * POINTS.normaal;
    }
    document.getElementById('score').textContent = score;

    // Wait for animation to complete
    setTimeout(() => {
        // Remove normal matches
        matches.forEach(([r, c]) => {
            board[r][c] = null;
        });

        // Drop tiles
        for (let j = 0; j < BOARD_SIZE; j++) {
            let emptyCount = 0;
            for (let i = BOARD_SIZE - 1; i >= 0; i--) {
                if (board[i][j] === null) {
                    emptyCount++;
                } else if (emptyCount > 0) {
                    board[i + emptyCount][j] = board[i][j];
                    board[i][j] = null;
                }
            }
        }

        // Fill empty spots
        for (let j = 0; j < BOARD_SIZE; j++) {
            for (let i = 0; i < BOARD_SIZE; i++) {
                if (board[i][j] === null) {
                    board[i][j] = generateNewTile();
                }
            }
        }

        // Update board
        createBoard();

        // Check for new matches
        setTimeout(() => {
            // Chain reaction bonus
            if (matches.length > 0) {
                score += POINTS.chain_bonus;
                document.getElementById('score').textContent = score;
            }
            
            // Check for new matches
            const matchesFound = findMatches();
            if (matchesFound.normal.length > 0 || matchesFound.special.length > 0) {
                // Set processing state
                isProcessingMatches = true;
                
                // Process new matches after a shorter delay
                setTimeout(() => {
                    processMatches();
                    // Wait for matches to be processed before allowing new clicks
                    setTimeout(() => {
                        // Check if there are still matches to process
                        const remainingMatches = findMatches();
                        if (remainingMatches.normal.length > 0 || remainingMatches.special.length > 0) {
                            // If there are still matches, keep processing
                            processMatches();
                        } else {
                            // Only reset processing state when all matches are processed
                            isProcessingMatches = false;
                        }
                    }, 500); // Wait 0.5 seconds for matches to be processed
                }, 500); // 0.5 seconden tussen chain reactions
            } else {
                // Reset processing state if no new matches
                isProcessingMatches = false;
            }
        }, 500); // Wait 0.5 seconds before checking for new matches
    }, 1000); // Wait for 1 second animation
}

// Handle tile click
function handleTileClick(e) {
    const tile = e.target;
    const row = parseInt(tile.dataset.row);
    const col = parseInt(tile.dataset.col);
    
    if (!selectedTile) {
        // Check if we're in cooldown period or processing matches
        if (isCooldown || isProcessingMatches) {
            return; // Don't allow selection during cooldown or processing matches
        }
        selectedTile = { row, col };
        tile.classList.add('selected');
        
        // Start timer immediately when first tile is selected
        if (isFirstMove) {
            isFirstMove = false;
            startTimer();
        }
    } else {
        if (Math.abs(row - selectedTile.row) + Math.abs(col - selectedTile.col) === 1) {
            // Temporarily swap tiles
            swapTiles(board, selectedTile.row, selectedTile.col, row, col);
            
            // Create temporary board for checking matches
            const tempBoard = JSON.parse(JSON.stringify(board));
            
            // Check if swap creates a match
            const matches = findMatches();
            
            if (matches.normal.length > 0 || matches.special.length > 0) {
                // If match found, keep the swap and process matches
                createBoard();
                processMatches();
                moves++;
                document.getElementById('moves').textContent = moves;
                
                // Start cooldown period
                isCooldown = true;
                setTimeout(() => {
                    isCooldown = false;
                }, COOLDOWN_TIME);
            } else {
                // If no match found, swap back
                swapTiles(board, selectedTile.row, selectedTile.col, row, col);
                createBoard();
            }
            
            selectedTile = null;
        } else {
            selectedTile = { row, col };
            const selectedTiles = document.querySelectorAll('.selected');
            selectedTiles.forEach(t => t.classList.remove('selected'));
            tile.classList.add('selected');
        }
    }
}

// Start timer
function startTimer() {
    // Reset timer als deze al bestaat
    clearInterval(timer);
    
    // Start nieuwe timer
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timer').textContent = timeLeft;
        
        // Add red timer background for last 10 seconds
        const timerElement = document.getElementById('timer');
        if (timeLeft <= 10) {
            timerElement.style.color = 'red';
        } else {
            timerElement.style.color = 'white';
        }
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            gameOver();
        }
    }, 1000); // Timer interval van 1000ms = 1 seconde
}

// Game over
function gameOver() {
    isGameOver = true;
    clearInterval(timer);
    
    // Show game over container
    const gameOverContainer = document.querySelector('.game-over-container');
    const scoreInput = document.getElementById('player-score');
    
    // Set the score in the form
    scoreInput.value = score;
    
    // Show the container
    gameOverContainer.classList.remove('hidden');
    
    // Handle form submission
    const form = document.getElementById('score-form');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const playerName = document.getElementById('player-name').value;
        const playerEmail = document.getElementById('player-email').value;
        const playerScore = score;
        
        // Here you could add code to send the data to a server
        console.log('Form submitted:', {
            name: playerName,
            email: playerEmail,
            score: playerScore
        });
        
        // Hide the container
        gameOverContainer.classList.add('hidden');
        
        // Start a new game
        startGame();
    });
    
    const gameOverSound = new Audio('gameover.mp3');
    gameOverSound.play();
    
    const gameOverMessage = document.createElement('div');
    gameOverMessage.className = 'game-over';
    gameOverMessage.innerHTML = `
        <h2>Game Over!</h2>
        <p>Je score: ${score}</p>
        <button onclick="initializeGame()">Nieuw spel</button>
    `;
    document.querySelector('.game-container').appendChild(gameOverMessage);
}

// Start game
function startGame() {
    // Remove game over screen if it exists
    const gameOverScreen = document.querySelector('.game-over');
    if (gameOverScreen) {
        gameOverScreen.remove();
    }
    
    // Reset game state
    score = 0;
    moves = 0;
    timeLeft = 60;
    isGameOver = false;
    isFirstMove = true;
    isProcessingMatches = false; // Reset matches processing state
    isCooldown = false; // Reset cooldown state
    
    // Update UI
    document.getElementById('score').textContent = score;
    document.getElementById('moves').textContent = moves;
    document.getElementById('timer').textContent = timeLeft;
    
    // Clear game over message if it exists
    const gameOverElement = document.querySelector('.game-over');
    if (gameOverElement) {
        gameOverElement.remove();
    }
    
    // Reset board
    initializeBoard();
}

// Initialize game when DOM is loaded
// Start direct initialisatie
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    createBoard();
});
