import type { LinearSystem, LinearSystemSolver, SolverResult } from "./simulationTypes";

const DEFAULT_PIVOT_EPSILON = 1e-12;

export type SparseLinearSystemSolverOptions = {
  pivotEpsilon?: number;
};

type SparseRow = Map<number, number>;

const isValidIndex = (index: number, size: number) => (
  Number.isInteger(index) && index >= 0 && index < size
);

const validateSystem = (system: LinearSystem): string | undefined => {
  if(!Number.isInteger(system.size) || system.size < 0) {
    return "Linear system size must be a non-negative integer.";
  }

  if(system.rhs.length !== system.size) {
    return `Linear system RHS length ${system.rhs.length} does not match size ${system.size}.`;
  }

  const invalidRhsIndex = system.rhs.findIndex((value) => !Number.isFinite(value));
  if(invalidRhsIndex >= 0) {
    return `Linear system RHS contains a non-finite value at row ${invalidRhsIndex}.`;
  }

  const invalidEntry = system.entries.find((entry) => (
    !isValidIndex(entry.row, system.size) ||
    !isValidIndex(entry.column, system.size) ||
    !Number.isFinite(entry.value)
  ));
  if(invalidEntry) {
    return `Linear system contains an invalid entry at row ${invalidEntry.row}, column ${invalidEntry.column}.`;
  }

  return undefined;
};

const addValue = (
  row: SparseRow,
  column: number,
  value: number,
  pivotEpsilon: number,
) => {
  if(value === 0) return;

  const nextValue = (row.get(column) ?? 0) + value;
  if(Math.abs(nextValue) <= pivotEpsilon) {
    row.delete(column);
    return;
  }

  row.set(column, nextValue);
};

const createSparseRows = (
  system: LinearSystem,
  pivotEpsilon: number,
) => {
  const rows = Array.from({length: system.size}, () => new Map<number, number>());

  system.entries.forEach((entry) => {
    addValue(rows[entry.row], entry.column, entry.value, pivotEpsilon);
  });

  return rows;
};

const swapRows = <T,>(rows: T[], a: number, b: number) => {
  if(a === b) return;
  [rows[a], rows[b]] = [rows[b], rows[a]];
};

const eliminateBelowPivot = (
  rows: SparseRow[],
  rhs: number[],
  pivotColumn: number,
  pivotEpsilon: number,
) => {
  const pivotRow = rows[pivotColumn];
  const pivot = pivotRow.get(pivotColumn);
  if(pivot === undefined || Math.abs(pivot) <= pivotEpsilon) return;

  for(let rowIndex = pivotColumn + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const currentValue = row.get(pivotColumn);
    if(currentValue === undefined || Math.abs(currentValue) <= pivotEpsilon) {
      row.delete(pivotColumn);
      continue;
    }

    const factor = currentValue / pivot;
    row.delete(pivotColumn);
    pivotRow.forEach((pivotValue, column) => {
      if(column <= pivotColumn) return;
      addValue(row, column, -factor * pivotValue, pivotEpsilon);
    });
    rhs[rowIndex] -= factor * rhs[pivotColumn];
  }
};

const findPivotRow = (
  rows: SparseRow[],
  pivotColumn: number,
) => {
  let pivotRow = pivotColumn;
  let pivotAbs = Math.abs(rows[pivotRow].get(pivotColumn) ?? 0);

  for(let candidateRow = pivotColumn + 1; candidateRow < rows.length; candidateRow += 1) {
    const candidateAbs = Math.abs(rows[candidateRow].get(pivotColumn) ?? 0);
    if(candidateAbs > pivotAbs) {
      pivotRow = candidateRow;
      pivotAbs = candidateAbs;
    }
  }

  return {pivotRow, pivotAbs};
};

export const createSparseLinearSystemSolver = (
  options: SparseLinearSystemSolverOptions = {},
): LinearSystemSolver => {
  const pivotEpsilon = options.pivotEpsilon ?? DEFAULT_PIVOT_EPSILON;

  return {
    solve(system: LinearSystem): SolverResult {
      const validationError = validateSystem(system);
      if(validationError) {
        return {
          status: "error",
          message: validationError,
        };
      }

      if(system.size === 0) {
        return {
          status: "ok",
          values: [],
        };
      }

      const rows = createSparseRows(system, pivotEpsilon);
      const rhs = [...system.rhs];
      const size = system.size;

      for(let pivotColumn = 0; pivotColumn < size; pivotColumn += 1) {
        const {pivotRow, pivotAbs} = findPivotRow(rows, pivotColumn);
        if(pivotAbs <= pivotEpsilon) {
          return {
            status: "singular",
            message: `Linear system is singular near column ${pivotColumn}.`,
          };
        }

        swapRows(rows, pivotColumn, pivotRow);
        swapRows(rhs, pivotColumn, pivotRow);
        eliminateBelowPivot(rows, rhs, pivotColumn, pivotEpsilon);
      }

      const values = Array(size).fill(0) as number[];
      for(let rowIndex = size - 1; rowIndex >= 0; rowIndex -= 1) {
        const row = rows[rowIndex];
        const pivot = row.get(rowIndex);
        if(pivot === undefined || Math.abs(pivot) <= pivotEpsilon) {
          return {
            status: "singular",
            message: `Linear system is singular near row ${rowIndex}.`,
          };
        }

        let remainingRhs = rhs[rowIndex];
        row.forEach((value, column) => {
          if(column > rowIndex) {
            remainingRhs -= value * values[column];
          }
        });

        values[rowIndex] = remainingRhs / pivot;
      }

      return {
        status: "ok",
        values,
      };
    },
  };
};

export const sparseLinearSystemSolver = createSparseLinearSystemSolver();
