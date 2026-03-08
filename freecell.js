/**
 * Modern FreeCell Implementation
 * Refactored to ES6 Classes and Vanilla JS
 */

class Card {
    constructor(id, suit, value, colour, image) {
        this.id = id;
        this.suit = suit;
        this.value = value;
        this.colour = colour;
        this.image = image;
    }
}

class Deck {
    constructor() {
        const suits = ['clubs', 'spades', 'hearts', 'diamonds'];
        const values = [1, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
        const colours = { 'clubs': 'black', 'spades': 'black', 'hearts': 'red', 'diamonds': 'red' };
        this.cards = [];
        for (let i = 0; i < 52; i++) {
            const suit = suits[i % 4];
            const val = values[Math.floor(i / 4)];
            this.cards.push(new Card(i + 1, suit, val, colours[suit], `images/${i + 1}.png`));
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    getCard(id) {
        return this.cards.find(c => c.id === id);
    }
}

class Game {
    constructor() {
        this.free = Array(4).fill(null);
        this.suits = Array(4).fill(null);
        this.columns = Array(8).fill(null).map(() => []);
        this.deck = new Deck();
        this.history = [];
    }

    init() {
        this.deck.shuffle();
        for (let i = 0; i < 52; i++) {
            this.columns[i % 8].push(this.deck.cards[i]);
        }
        this.initialState = this.snapshot();
        this.history = [];
    }

    reset() {
        this.free = Array(4).fill(null);
        this.suits = Array(4).fill(null);
        this.columns = Array(8).fill(null).map(() => []);
        this.init();
    }

    restartCurrent() {
        if (this.initialState) {
            this.restore(this.initialState);
            this.history = [];
        }
    }

    undo() {
        if (this.history.length > 0) {
            const prevState = this.history.pop();
            this.restore(prevState);
            return true;
        }
        return false;
    }

    snapshot() {
        return {
            free: [...this.free],
            suits: [...this.suits],
            columns: this.columns.map(col => [...col])
        };
    }

    restore(state) {
        this.free = [...state.free];
        this.suits = [...state.suits];
        this.columns = state.columns.map(col => [...col]);
    }

    saveState() {
        this.history.push(this.snapshot());
    }

    getValidDragIds() {
        const dragIds = [];
        // Freecells
        this.free.forEach(card => card && dragIds.push(card.id));
        // Columns
        this.columns.forEach(col => {
            for (let j = col.length - 1; j >= 0; j--) {
                const card = col[j];
                if (j === col.length - 1) {
                    dragIds.push(card.id);
                } else {
                    const next = col[j + 1];
                    if (card.value === next.value + 1 && card.colour !== next.colour) {
                        dragIds.push(card.id);
                    } else {
                        break;
                    }
                }
            }
        });
        return dragIds;
    }

    getValidDropIds(cardId) {
        if (!cardId) return [];
        const dragCard = this.deck.getCard(cardId);
        if (!dragCard) return [];

        const stackInfo = this.getStackInfo(cardId);
        if (!stackInfo) return [];
        const stackSize = stackInfo.stack.length;

        const emptyFree = this.free.filter(f => !f).length;
        const emptyCols = this.columns.filter(c => c.length === 0).length;

        const maxMovable = (1 + emptyFree) * Math.pow(2, emptyCols);
        const maxMovableEmpty = (1 + emptyFree) * Math.pow(2, Math.max(0, emptyCols - 1));

        const dropIds = [];

        if (stackSize === 1) {
            // Freecells
            this.free.forEach((f, i) => !f && dropIds.push(`free${i}`));
            // Foundations
            this.suits.forEach((s, i) => {
                if (!s) {
                    if (dragCard.value === 1) dropIds.push(`suit${i}`);
                } else if (dragCard.suit === s.suit && dragCard.value === s.value + 1) {
                    dropIds.push(`suit${i}`);
                }
            });
        }

        // Columns
        this.columns.forEach((col, i) => {
            if (col.length > 0) {
                const bottom = col[col.length - 1];
                if (stackInfo.stack.some(s => s.id === bottom.id)) return;
                if (bottom.value === dragCard.value + 1 && bottom.colour !== dragCard.colour) {
                    if (stackSize <= maxMovable) dropIds.push(`col${i}`);
                }
            } else {
                if (stackSize <= maxMovableEmpty || stackSize === 1) dropIds.push(`col${i}`);
            }
        });

        return dropIds;
    }

    getStackInfo(cardId) {
        for (let i = 0; i < 8; i++) {
            const col = this.columns[i];
            const idx = col.findIndex(c => c.id === cardId);
            if (idx !== -1) return { col: i, idx, stack: col.slice(idx) };
        }
        const freeIdx = this.free.findIndex(c => c && c.id === cardId);
        if (freeIdx !== -1) return { col: -1, idx: freeIdx, stack: [this.free[freeIdx]] };
        return null;
    }

    moveCard(dragId, dropId) {
        this.saveState();
        const stack = this.popStack(dragId);
        if (!stack) return;

        const idx = parseInt(dropId.slice(-1), 10);
        if (dropId.startsWith('f')) {
            this.free[idx] = stack[0];
        } else if (dropId.startsWith('s')) {
            this.suits[idx] = stack[0];
        } else if (dropId.startsWith('c')) {
            this.columns[idx].push(...stack);
        }
    }

    popStack(cardId) {
        for (let i = 0; i < 8; i++) {
            const col = this.columns[i];
            const idx = col.findIndex(c => c.id === cardId);
            if (idx !== -1) return col.splice(idx);
        }
        const freeIdx = this.free.findIndex(c => c && c.id === cardId);
        if (freeIdx !== -1) {
            const c = this.free[freeIdx];
            this.free[freeIdx] = null;
            return [c];
        }
        return null;
    }

    isGameWon() {
        return this.suits.every(s => s && s.value === 13);
    }
}

class UI {
    constructor(game) {
        this.game = game;
        this.autoCollectActive = false;
        this.draggedEl = null;
        this.draggedStack = null;
        this.dragOffset = { x: 0, y: 0 };
        this.tableEl = document.getElementById('table');
        this.init();
    }

    init() {
        this.game.init();
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        document.getElementById('newgame').addEventListener('click', () => {
            this.game.reset();
            this.render();
        });

        document.getElementById('restart').addEventListener('click', () => {
            this.game.restartCurrent();
            this.render();
        });

        document.getElementById('undo').addEventListener('click', () => {
            if (this.game.undo()) {
                this.render();
            }
        });

        const helpDialog = document.getElementById('helptext');
        const winDialog = document.getElementById('windialog');

        document.getElementById('help').addEventListener('click', () => helpDialog.showModal());
        document.getElementById('close-help').addEventListener('click', () => helpDialog.close());
        document.getElementById('close-win').addEventListener('click', () => {
            winDialog.close();
            this.game.reset();
            this.render();
        });

        // Global mouse events for drag and drop
        document.addEventListener('mousedown', e => this.onMouseDown(e));
        document.addEventListener('mousemove', e => this.onMouseMove(e));
        document.addEventListener('mouseup', e => this.onMouseUp(e));
    }

    render() {
        // Clear containers
        document.querySelectorAll('.column, .free, .suit').forEach(el => el.innerHTML = '');

        // Render Columns
        this.game.columns.forEach((col, i) => {
            const colEl = document.getElementById(`col${i}`);
            col.forEach((card, j) => this.createCardEl(card, colEl, j * 30));
        });

        // Render Freecells
        this.game.free.forEach((card, i) => {
            if (card) this.createCardEl(card, document.getElementById(`free${i}`), 0);
        });

        // Render Suits
        this.game.suits.forEach((card, i) => {
            if (card) this.createCardEl(card, document.getElementById(`suit${i}`), 0);
        });
    }

    createCardEl(card, container, top) {
        const el = document.createElement('div');
        el.className = 'card';
        el.id = `card-${card.id}`;
        el.style.top = `${top}px`;
        el.innerHTML = `<img src="${card.image}" draggable="false">`;

        el.addEventListener('dblclick', () => this.autoMove(card.id));
        container.appendChild(el);
        return el;
    }

    onMouseDown(e) {
        const cardEl = e.target.closest('.card');
        if (!cardEl || cardEl.classList.contains('dragging')) return;

        const cardId = parseInt(cardEl.id.split('-')[1], 10);
        const validDrags = this.game.getValidDragIds();

        if (!validDrags.includes(cardId)) return;

        const info = this.game.getStackInfo(cardId);
        if (!info) return;

        this.draggedEl = cardEl;
        this.draggedStack = info.stack;

        const rect = cardEl.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // Prepare dragged stack visually
        this.draggedEl.classList.add('dragging');
        if (info.stack.length > 1) {
            for (let i = 1; i < info.stack.length; i++) {
                const child = document.getElementById(`card-${info.stack[i].id}`);
                child.style.top = `${i * 30}px`;
                this.draggedEl.appendChild(child);
            }
        }

        // Move to top level for dragging
        document.body.appendChild(this.draggedEl);
        this.updateDraggedPosition(e.clientX, e.clientY);
    }

    onMouseMove(e) {
        if (!this.draggedEl) return;
        this.updateDraggedPosition(e.clientX, e.clientY);

        // Highlight potential drop targets
        const cardId = parseInt(this.draggedEl.id.split('-')[1], 10);
        const validDrops = this.game.getValidDropIds(cardId);

        document.querySelectorAll('.column, .free, .suit').forEach(el => {
            el.classList.remove('drop-target');
            if (validDrops.includes(el.id)) {
                const rect = el.getBoundingClientRect();
                if (e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom) {
                    el.classList.add('drop-target');
                }
            }
        });
    }

    onMouseUp(e) {
        if (!this.draggedEl) return;

        const cardId = parseInt(this.draggedEl.id.split('-')[1], 10);
        const validDrops = this.game.getValidDropIds(cardId);

        let targetId = null;
        document.querySelectorAll('.column, .free, .suit').forEach(el => {
            if (validDrops.includes(el.id)) {
                const rect = el.getBoundingClientRect();
                if (e.clientX > rect.left && e.clientX < rect.right && e.clientY > rect.top && e.clientY < rect.bottom) {
                    targetId = el.id;
                }
            }
        });

        if (targetId) {
            this.game.moveCard(cardId, targetId);
            if (this.game.isGameWon()) this.showWin();
        }

        this.draggedEl.remove(); // Remove the element from document body
        this.draggedEl = null;
        this.draggedStack = null;

        this.render();
        this.autoCollect();
    }

    updateDraggedPosition(x, y) {
        this.draggedEl.style.left = `${x - this.dragOffset.x}px`;
        this.draggedEl.style.top = `${y - this.dragOffset.y}px`;
    }

    autoCollect() {
        if (this.autoCollectActive) return;
        this.autoCollectActive = true;

        const dragIds = this.game.getValidDragIds();
        let moved = false;

        for (const cardId of dragIds) {
            const card = this.game.deck.getCard(cardId);
            const drops = this.game.getValidDropIds(cardId);
            const suitDrop = drops.find(d => d.startsWith('suit'));

            if (suitDrop && this.isSafeToCollect(card)) {
                this.autoMove(cardId);
                moved = true;
                break;
            }
        }

        this.autoCollectActive = false;
        if (moved) {
            setTimeout(() => this.autoCollect(), 350);
        }
    }

    isSafeToCollect(card) {
        if (card.value <= 2) return true;
        const otherColor = (card.colour === 'red') ? 'black' : 'red';
        let count = 0;
        this.game.suits.forEach(s => {
            if (s && s.colour === otherColor && s.value >= card.value - 1) {
                count++;
            }
        });
        return count === 2;
    }

    autoMove(cardId) {
        const drops = this.game.getValidDropIds(cardId);
        if (drops.length === 0) return;

        // Best move selection:
        // 1. Foundation (if safe)
        // 2. Foundation (even if unsafe, if it's the only one)
        // 3. Columns (non-empty)
        // 4. Free cells
        // 5. Empty columns

        const suitDrop = drops.find(d => d.startsWith('suit'));
        const columnDrop = drops.find(d => d.startsWith('col') && this.game.columns[parseInt(d.slice(-1), 10)].length > 0);
        const freeDrop = drops.find(d => d.startsWith('free'));
        const emptyColDrop = drops.find(d => d.startsWith('col') && this.game.columns[parseInt(d.slice(-1), 10)].length === 0);

        const target = suitDrop || columnDrop || freeDrop || emptyColDrop;

        if (target) {
            const el = document.getElementById(`card-${cardId}`);
            if (!el) return;

            const targetEl = document.getElementById(target);
            const targetRect = targetEl.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();

            el.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            el.style.zIndex = '2000';
            el.style.transform = `translate(${targetRect.left - elRect.left}px, ${targetRect.top - elRect.top}px)`;

            setTimeout(() => {
                this.game.moveCard(cardId, target);
                this.render();
                if (this.game.isGameWon()) this.showWin();
                this.autoCollect(); // Check for chains
            }, 300);
        }
    }

    showWin() {
        document.getElementById('windialog').showModal();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new UI(new Game());
});
