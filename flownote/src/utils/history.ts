/**
 * Command-pattern undo/redo history manager.
 *
 * Each undoable action is wrapped in a `Command` object that knows how
 * to execute and reverse itself. The `History` class maintains two stacks
 * (undo and redo) and provides `undo()` / `redo()` methods.
 *
 * When a new command is pushed, the redo stack is cleared — this prevents
 * branching timelines (standard editor behavior).
 */

/** A reversible action that can be undone and redone. */
export interface Command {
    /** Human-readable label (e.g. "Move item", "Create sticky note"). */
    readonly description: string;
    /** Apply the action. Called on first execution and on redo. */
    execute(): void;
    /** Reverse the action. */
    undo(): void;
}

/**
 * Manages a linear undo/redo history of commands.
 */
export class History {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private maxSize: number;

    constructor(maxSize: number = 100) {
        this.maxSize = maxSize;
    }

    /**
     * Executes a command and pushes it onto the undo stack.
     * Clears the redo stack (no branching).
     */
    push(command: Command): void {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];

        // Evict oldest commands if stack exceeds max size
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
    }

    /**
     * Undoes the most recent command and moves it to the redo stack.
     * Returns the command that was undone, or null if nothing to undo.
     */
    undo(): Command | null {
        const command = this.undoStack.pop();
        if (!command) return null;
        command.undo();
        this.redoStack.push(command);
        return command;
    }

    /**
     * Redoes the most recently undone command.
     * Returns the command that was redone, or null if nothing to redo.
     */
    redo(): Command | null {
        const command = this.redoStack.pop();
        if (!command) return null;
        command.execute();
        this.undoStack.push(command);
        return command;
    }

    /** Whether there are commands to undo. */
    get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /** Whether there are commands to redo. */
    get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /** Clears both stacks. */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}
