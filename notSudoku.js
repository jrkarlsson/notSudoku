
/** Hook some eventhandlers to the buttons */
$('button#reset').on('click', function() {
    game.resetGame();
});

$('button#validate').on('click', function() {
    game.validateBoard();
});

$('button#solve').on('click', function() {
    game.solve(game.gameBoard, 0, 0, true);
});

/**
 * The game object istself
 * @type {Object}
 */
var game = {
    boardSize: 9, // Everything breaks if changed, maybe in the future
    solverBoard: null,
    gameBoard: null,
    css: {
        conflict: 'conflict',
    },

    /**
     * Initialize the game
     * @return {object} The game object
     */
    init: function() {
        // console.log('Initializing!');
        this.solverBoard = this.generateEmptyBoard();
        this.solve(this.solverBoard, 0, 0, false);
        this.gameBoard = this.generateGameBoard();
        this.drawGameBoard();
        delete this.init;

        return this;
    },

    /**
     * Generate a 2D board
     * @return {array}
     */
    generateEmptyBoard: function() {
        var board = new Array(this.boardSize);

        for(var j = 0; j < this.boardSize; j++) {
            board[j] = new Array(this.boardSize);

            for(var i = 0; i < this.boardSize; i++) {
                board[j][i] = {
                    y: j,
                    x: i,
                    val: null,
                    element: null,
                };
            }
        }

        return board;
    },

    /**
     * Generate the gameboard with hints
     * @return {object}
     */
    generateGameBoard: function() {
        var gameBoard = this.generateEmptyBoard();

        for(var j = 0; j < this.boardSize; j++) {
            for(var i = 0; i < this.boardSize; i++) {
                if(Math.random() < 0.25) {
                    gameBoard[j][i].val = this.solverBoard[j][i].val;
                }
            }
        }

        return gameBoard;
    },


    /**
     * Generate GUI components
     */
    drawGameBoard: function() {
        var gameBoardGui = $('table#gameBoard');

        gameBoardGui.html('');

        for (var y = 0; y < this.boardSize; y++) {
            var row = $('<tr></tr>');
            gameBoardGui.append(row);

            for (var x = 0; x < this.boardSize; x++) {
                var column = $('<td></td>');
                row.append(column);

                var input = $('<input>', {
                        'data-y': y,
                        'data-x': x,
                        'value': ((this.gameBoard[y][x].val !== null) ? this.gameBoard[y][x].val : ''),
                        'type':'text',
                        'maxlength': 1,
                        keyup: function(e) { 
                            game.readUserInput(e) 
                        }
                    });

                if(this.gameBoard[y][x].val !== null) {
                    input.attr('disabled', 'disabled');
                }

                this.gameBoard[y][x].element = input;

                column.append(input);
            };
        };
    },

    /**
     * Reset the boards and start over
     */
    resetGame: function() {
        this.solverBoard = this.generateEmptyBoard();
        this.solve(this.solverBoard, 0, 0, false);
        this.gameBoard = this.generateGameBoard();
        this.drawGameBoard();
    },


    /**
     * Adds some css class to conflicted cells
     */
    addConflictClass: function(affected) {
        for(var i = 0; i < affected.length; i++) {
            affected[i].element.addClass(this.css.conflict);
        }
    },

    /**
     * Removes some css class to conflicted cells
     */
    removeConflictClass: function() {
        for(var j = 0; j < this.boardSize; j++) {
            for (var i = 0; i < this.boardSize; i++) {
                this.gameBoard[j][i].element.removeClass(this.css.conflict);
            };
        }
    },

    /**
     * Called when the user types something into any cell
     * @param  {event} e jQuery event object
     */
    readUserInput: function(e) {

        var target = $(e.currentTarget);
        var targetValue = target.val();
        var input = {
            y: parseInt(target.data('y')),
            x: parseInt(target.data('x')),
            val: (targetValue === '') ? null : parseInt(targetValue),
            element: target,
        };

        this.removeConflictClass();

        this.gameBoard[input.y][input.x].val = input.val;

        var conflict = this.validateInput(input);
        
        if(conflict.exists) {
            this.addConflictClass(conflict.affected);
            input.element.addClass(this.css.conflict);
        }
    },
    
    /**
     * Validates the users input and returns any conflicts
     * @param  {object} input Contains coordinates and values
     * @return {object}       Contains status and a collection
     */
    validateInput: function(input) {
        var conflict = {
            exists: false,
            affected: [],
        };

        // Small sanity check (could be better)
        if(input.val !== null) {
            if(input.val > this.boardSize || input.val < 1 || isNaN(input.val)) {
                conflict.exists = true;
            }
            // If everything seems ok, proceed to check for conflicts
            else {
                this.validateHorizontal(input, conflict);
                this.validateVertical(input, conflict);
                this.validateGrid(input, conflict);
            }
        }

        return conflict;
    },

    /**
     * Validates the entire board cell by cell.
     */
    validateBoard: function() {
        var conflict = {
            exists: false,
            affected: [],
        };

        for (var j = 0; j < this.boardSize; j++) {
            for(var i = 0; i < this.boardSize; i++) {
                if(this.gameBoard[i][j].val !== null) {
                    this.validateHorizontal(this.gameBoard[j][i], conflict);
                    this.validateVertical(this.gameBoard[j][i], conflict);
                    this.validateGrid(this.gameBoard[j][i], conflict);
                }
                else {
                    conflict.exists = true;
                }
            }
        }

        if(conflict.exists) {
            alert('Sorry! There seems to be some conflicts and/or empty cells!');
            this.addConflictClass(conflict.affected);
        }
        else {
            alert('Congratulations! You solved the puzzle!');
        }
    },

    /**
     * Get the starting position and counter for a "grid"
     * @param  {int}    y Cell coordinate
     * @param  {int}    x Cell coor
     * @return {object}
     */
    getGrid: function(y, x) {
        var sqrt = Math.sqrt(this.boardSize);

        return {
            y: Math.floor(y / sqrt) * sqrt,
            x: Math.floor(x / sqrt) * sqrt,
            c: sqrt,
        };
    },

    /**
     * Performs a individual cell check
     * @param  {object} input Contains coordinates and values
     * @param  {int}    j     Cell coordinate
     * @param  {int}    i     Cell coordinate
     * @return {bool}
     */
    check: function(input, j, i) {
        // Check if the value is the same and that it isn't matching against itself.
        if(this.gameBoard[j][i].val === input.val && !(j === input.y && i === input.x)) {
                return true;
        }

        return false;
    },

    /**
     * Validate on the X axis
     * @param  {object} input    Contains coordinates and values
     * @param  {object} conflict Contains status and a collection
     */
    validateHorizontal: function(input, conflict) {
        var j = input.y;

        for (var i = 0; i < game.boardSize; i++) {
            if(this.check(input, j, i)) {
                conflict.exists = true;

                if(conflict.affected.indexOf(this.gameBoard[j][i])) {
                    conflict.affected.push(this.gameBoard[j][i]);
                }
                // console.log('Conflict(horizontal):', conflict) ;
            }
        };
        
    },

    /**
     * Validate on the Y axis
     * @param  {object} input    Contains coordinates and values
     * @param  {object} conflict Contains status and a collection
     */
    validateVertical: function(input, conflict) {
        var i = input.x;

        for (var j = 0; j < game.boardSize; j++) {
            if(this.check(input, j, i)) {
                conflict.exists = true;

                if(conflict.affected.indexOf(this.gameBoard[j][i])) {
                    conflict.affected.push(this.gameBoard[j][i]);
                }
                // console.log('Conflict(vertical):', conflict) ;
            }
        };
        
    },

    /**
     * Validate on the grid
     * @param  {object} input    Contains coordinates and values
     * @param  {object} conflict Contains status and a collection
     */
    validateGrid: function(input, conflict) { 
        var grid = this.getGrid(input.y, input.x);

        for(var j = grid.y; j < (grid.y + grid.c); j++) {
            for(var i = grid.x; i < (grid.x + grid.c); i++) {
                if(this.check(input, j, i)) {
                    conflict.exists = true;

                    if(conflict.affected.indexOf(this.gameBoard[j][i])) {
                        conflict.affected.push(this.gameBoard[j][i]);
                    }
                    // console.log('Conflict(grid):', conflict) ;
                }
            }
        }
    },

    /**
     * Find the next empty cell.
     * @param  {object} board   A gameboard
     * @param  {int}    y       Cell coordinate
     * @param  {int}    x       Cell coordinate
     * @return {object}         Either returns a reference or false
     */
    nextEmptyCell: function(board, y, x) {
        for(var j = y; j < this.boardSize; j++) {
            for(var i = x; i < this.boardSize; i++) {
                // console.log('y: ', y, 'j: ', j, 'x: ', x, 'i: ', i, board);
                if(board[j][i].val === null || isNaN(board[j][i].val)) {
                    return board[j][i];
                }
            }

            x = 0; 
        }

        return false;
    },

    /**
     * Return all the legal values for a given cell
     * @param  {object} board   A gameboard
     * @param  {int}    y       Cell coordinate
     * @param  {int}    x       Cell coordinate
     * @return {array}          Resulting array of legal values
     */
    getLegalValues: function(board, y, x) {
        var legalValues = [1,2,3,4,5,6,7,8,9];

        // Shave off horizontal values
        for(var i = 0; i < this.boardSize; i++) {
            if(board[y][i].val !== null && legalValues.indexOf(board[y][i].val) !== -1) {
                legalValues.splice(legalValues.indexOf(board[y][i].val), 1);
            }
        }

        // Shave off vertical values
        for(var j = 0; j < this.boardSize; j++) {
            if(board[j][x].val !== null && legalValues.indexOf(board[j][x].val) !== -1) {
                legalValues.splice(legalValues.indexOf(board[j][x].val), 1);
            }
        }

        // Shave off grid values
        var grid = this.getGrid(y, x);

        for(var gj = grid.y; gj < (grid.y + grid.c); gj++) {
            for(var gi = grid.x; gi < (grid.x + grid.c); gi++) {
                 if(board[gj][gi].val !== null && legalValues.indexOf(board[gj][gi].val) !== -1) {
                    legalValues.splice(legalValues.indexOf(board[gj][gi].val), 1);
                }
            }
        }

        // Shuffle it to provide more variation
        legalValues = this.shuffleArray(legalValues);

        return legalValues;
    },

    /**
     * Shuffles the values in an array
     * @param  {array} legalValues Array with legal values
     * @return {array}             Array with legal values shifted around
     */
    shuffleArray: function(legalValues) {
        for (var i = legalValues.length - 1; i > 0; i--) {
            var random = Math.floor(Math.random() * (i + 1));
            var tmp = legalValues[i];

            legalValues[i] = legalValues[random];
            legalValues[random] = tmp;
        }

        return legalValues;
    },

    /**
     * The solver itself, based on a backtracking algorithm found on StackOverflow:
     * http://stackoverflow.com/questions/18168503/recursively-solving-a-sudoku-puzzle-using-backtracking-theoretically
     * @param  {object} board   A gameboard
     * @param  {int}    j       Cell coordinate
     * @param  {int}    i       Cell coordinate
     * @return {bool}
     */
    solve: function(board, j, i, printOut) {
        var nextCell = this.nextEmptyCell(board, j, i);

        if(nextCell === false) {
            return true;
        }
        else {
            var legalValues = this.getLegalValues(board, nextCell.y, nextCell.x);

            for(var i = 0; i < legalValues.length; i++) {
                nextCell.val = legalValues[i];
                if(printOut) {
                    nextCell.element.val(legalValues[i]);
                }


                if(this.solve(board, nextCell.y, nextCell.x, printOut)) {
                    return true;
                }
                else {
                    nextCell.val = null;
                }
            }
            
            return false;
        }
    },
}.init(); // Auto execute init()