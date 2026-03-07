/**
 * Encapsulate the game logic
 */
var Game = function() {
    this.free = [null, null, null, null];
    this.suits = [null, null, null, null];
    this.columns = [[], [], [], [], [], [], [], []];
    this.deck = new this.Deck();
};

Game.prototype.init = function() {
    this.deck.shuffle();
    for (var i = 0; i < 52; i++) {
        this.columns[i % 8].push(this.deck.cards[i]);
    }
};

Game.prototype.reset = function() {
    this.free = [null, null, null, null];
    this.suits = [null, null, null, null];
    for (var i = 0; i < 8; i++) {
        this.columns[i].length = 0;
    }
    this.init();
};

/**
 * Identify all cards that can be the start of a drag
 */
Game.prototype.valid_drag_ids = function() {
    var drag_ids = [], i, j, col, card;

    // Freecells
    for (i = 0; i < 4; i++) {
        if (this.free[i]) drag_ids.push(this.free[i].id);
    }

    // Columns - any card that starts a valid descending alternating sequence
    for (i = 0; i < 8; i++) {
        col = this.columns[i];
        for (j = col.length - 1; j >= 0; j--) {
            card = col[j];
            if (j === col.length - 1) {
                drag_ids.push(card.id);
            } else {
                var next = col[j + 1];
                if (card.value === next.value + 1 && card.colour !== next.colour) {
                    drag_ids.push(card.id);
                } else {
                    break;
                }
            }
        }
    }
    return drag_ids;
};

/**
 * Valid drop locations for a card (or stack)
 */
Game.prototype.valid_drop_ids = function(card_id) {
    if (!card_id) return [];
    var drop_ids = [], i, card, suit_card, drag_card, col;
    drag_card = this.deck.get_card(card_id);
    if (!drag_card) return [];
    
    var stack_info = this.get_stack_info(card_id);
    if (!stack_info) return [];
    var stack_size = stack_info.stack.length;

    var empty_free = this.free.filter(f => !f).length;
    var empty_cols = this.columns.filter(c => c.length === 0).length;
    
    // Formula for moving to a non-empty column: (1 + F) * 2^E
    var max_movable = (1 + empty_free) * Math.pow(2, empty_cols);
    // Formula for moving to an empty column: (1 + F) * 2^(E-1)
    var max_movable_empty = (1 + empty_free) * Math.pow(2, Math.max(0, empty_cols - 1));

    if (stack_size === 1) {
        // Freecells
        for (i = 0; i < 4; i++) if (!this.free[i]) drop_ids.push('free' + i);
        
        // Foundations
        for (i = 0; i < 4; i++) {
            suit_card = this.suits[i];
            if (!suit_card) {
                if (drag_card.value === 1) drop_ids.push('suit' + i);
            } else if (drag_card.suit === suit_card.suit && drag_card.value === suit_card.value + 1) {
                drop_ids.push('suit' + i);
            }
        }
    }

    // Existing Columns
    for (i = 0; i < 8; i++) {
        col = this.columns[i];
        if (col.length > 0) {
            var bottom = col[col.length - 1];
            // Don't drop on own stack
            if (stack_info.stack.some(s => s.id === bottom.id)) continue;
            
            if (bottom.value === drag_card.value + 1 && bottom.colour !== drag_card.colour) {
                if (stack_size <= max_movable) drop_ids.push('col' + i);
            }
        } else {
            // Empty columns
            if (stack_size <= max_movable_empty || stack_size === 1) drop_ids.push('col' + i);
        }
    }
    return drop_ids;
};

Game.prototype.get_stack_info = function(card_id) {
    var i, j, col;
    for (i = 0; i < 8; i++) {
        col = this.columns[i];
        for (j = 0; j < col.length; j++) {
            if (col[j].id === card_id) return { col: i, idx: j, stack: col.slice(j) };
        }
    }
    for (i = 0; i < 4; i++) {
        if (this.free[i] && this.free[i].id === card_id) return { col: -1, idx: i, stack: [this.free[i]] };
    }
    return null;
};

Game.prototype.move_card = function(drag_id, drop_id) {
    var stack = this.pop_stack(drag_id);
    if (!stack) return;

    var idx = parseInt(drop_id.slice(-1), 10);
    if (drop_id.startsWith('f')) {
        this.free[idx] = stack[0];
    } else if (drop_id.startsWith('s')) {
        this.suits[idx] = stack[0];
    } else if (drop_id.startsWith('c')) {
        this.columns[idx] = this.columns[idx].concat(stack);
    }
};

Game.prototype.pop_stack = function(card_id) {
    var i, j, col;
    for (i = 0; i < 8; i++) {
        col = this.columns[i];
        for (j = 0; j < col.length; j++) {
            if (col[j].id === card_id) return col.splice(j);
        }
    }
    for (i = 0; i < 4; i++) {
        if (this.free[i] && this.free[i].id === card_id) {
            var c = this.free[i];
            this.free[i] = null;
            return [c];
        }
    }
    return null;
};

Game.prototype.is_game_won = function() {
    return this.suits.every(s => s && s.value === 13);
};

/******************************************************************************/

Game.prototype.Deck = function() {
    var suits = ['clubs', 'spades', 'hearts', 'diamonds'];
    var values = [1, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    var colours = {'clubs': 'black', 'spades': 'black', 'hearts': 'red', 'diamonds': 'red'};
    this.cards = [];
    for (var i = 0; i < 52; i++) {
        var suit = suits[i % 4];
        var val = values[Math.floor(i / 4)];
        this.cards.push({ id: i + 1, suit: suit, value: val, colour: colours[suit], image: 'images/' + (i+1) + '.png' });
    }
};

Game.prototype.Deck.prototype.shuffle = function() {
    for (var i = this.cards.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
};

Game.prototype.Deck.prototype.get_card = function(id) {
    return this.cards.find(c => c.id === id);
};

/******************************************************************************/

var UI = function(game) {
    this.game = game;
    this.auto_collect_active = false;
};

UI.prototype.init = function() {
    this.game.init();
    this.render();
    this.setup_controls();
    this.setup_droppables();
};

UI.prototype.render = function() {
    $('.column, .free, .suit').empty();
    
    // Render Columns
    for (var i = 0; i < 8; i++) {
        var col_div = $('#col' + i);
        this.game.columns[i].forEach((card, j) => {
            this.create_card_el(card, col_div, j * 30);
        });
    }

    // Render Freecells
    for (var i = 0; i < 4; i++) {
        if (this.game.free[i]) this.create_card_el(this.game.free[i], $('#free' + i), 0);
    }

    // Render Suits
    for (var i = 0; i < 4; i++) {
        if (this.game.suits[i]) this.create_card_el(this.game.suits[i], $('#suit' + i), 0);
    }

    this.init_draggables();
};

UI.prototype.create_card_el = function(card, container, top) {
    var el = $('<div class="card" id="' + card.id + '"><img src="' + card.image + '"></div>');
    el.css('top', top + 'px');
    container.append(el);
    return el;
};

UI.prototype.init_draggables = function() {
    var self = this;
    var drag_ids = this.game.valid_drag_ids();

    drag_ids.forEach(id => {
        var el = $('#' + id);
        el.draggable({
            containment: '#table',
            revert: 'invalid',
            revertDuration: 250,
            zIndex: 999,
            start: function(event, ui) {
                var card_id = parseInt(this.id, 10);
                var info = self.game.get_stack_info(card_id);
                // Attach children visually
                if (info && info.stack.length > 1) {
                    for (var i = 1; i < info.stack.length; i++) {
                        var child = $('#' + info.stack[i].id);
                        child.data('orig-parent', child.parent());
                        child.data('orig-top', child.css('top'));
                        child.css('top', (i * 30) + 'px');
                        child.appendTo(el);
                    }
                }
            },
            stop: function(event, ui) {
                $(this).children('.card').each(function() {
                    $(this).appendTo($(this).data('orig-parent')).css('top', $(this).data('orig-top'));
                });
                self.render();
                self.auto_collect();
            }
        });

        el.dblclick(function() {
            self.auto_move(parseInt(this.id, 10));
        });
    });
};

UI.prototype.setup_droppables = function() {
    var self = this;
    $('.column, .free, .suit').droppable({
        tolerance: 'pointer',
        accept: function(draggable) {
            var card_id = parseInt(draggable.attr('id'), 10);
            var valid_drops = self.game.valid_drop_ids(card_id);
            return valid_drops.includes(this.id);
        },
        drop: function(event, ui) {
            var card_id = parseInt(ui.draggable.attr('id'), 10);
            self.game.move_card(card_id, this.id);
            if (self.game.is_game_won()) self.show_win();
            // render() and auto_collect() are called in draggable.stop
        }
    });
};

/**
 * Automatically move cards to foundations if they have no other place to stay
 */
UI.prototype.auto_collect = function() {
    if (this.auto_collect_active) return;
    this.auto_collect_active = true;

    var self = this;
    var moved = false;
    var drag_ids = this.game.valid_drag_ids();

    for (var i = 0; i < drag_ids.length; i++) {
        var card_id = drag_ids[i];
        var card = this.game.deck.get_card(card_id);
        var drops = this.game.valid_drop_ids(card_id);
        var suit_drop = drops.find(d => d.startsWith('suit'));

        if (suit_drop) {
            // Check if it's safe to collect 
            // Safety rule: it's safe to collect if all cards of smaller value 
            // in alternating colors are already in foundations.
            // Simplified: if value is 1 or 2, always safe. Higher values need checking.
            if (this.is_safe_to_collect(card)) {
                this.auto_move(card_id);
                moved = true;
                break; // One card at a time to keep it visual
            }
        }
    }

    this.auto_collect_active = false;
    if (moved) {
        // If we moved something, wait for animation and check again
        setTimeout(() => self.auto_collect(), 500);
    }
};

UI.prototype.is_safe_to_collect = function(card) {
    if (card.value <= 2) return true; // Aces and Twos are always safe
    
    // For other cards, check if we might need them for a build
    // A card is safe if both opposite color cards of value-1 are already in foundations
    var other_color = (card.colour === 'red') ? 'black' : 'red';
    
    var count = 0;
    this.game.suits.forEach(s => {
        if (s && s.colour === other_color && s.value >= card.value - 1) {
            count++;
        }
    });
    
    return count === 2;
};

UI.prototype.auto_move = function(card_id) {
    var drops = this.game.valid_drop_ids(card_id);
    var suit_drop = drops.find(d => d.startsWith('suit'));
    var target = suit_drop || drops.find(d => d.startsWith('free'));
    
    if (target) {
        var el = $('#' + card_id);
        if (el.length === 0) return; // Safeguard if re-render happened

        var target_el = $('#' + target);
        var offset = target_el.offset();
        var cur = el.offset();
        
        el.css('z-index', 2000).animate({
            left: '+=' + (offset.left - cur.left),
            top: '+=' + (offset.top - cur.top)
        }, 300, () => {
            this.game.move_card(card_id, target);
            this.render();
            if (this.game.is_game_won()) this.show_win();
        });
    }
};

UI.prototype.setup_controls = function() {
    $('#newgame').click(() => {
        this.game.reset();
        this.render();
    });
    $('#help').click(() => $('#helptext').dialog('open'));
    $('#helptext').dialog({ autoOpen: false, modal: true, width: 600 });
    $('#windialog').dialog({ autoOpen: false, modal: true });
};

UI.prototype.show_win = function() {
    $('#windialog').dialog('open');
};

$(document).ready(() => {
    var g = new Game();
    var ui = new UI(g);
    ui.init();
});
