import type { LinearSystem, LinearSystemSolver, SolverResult } from "./simulationTypes";

const DEFAULT_PIVOT_EPSILON = 1e-12;

export type DenseLinearSystemSolverOptions = {
  pivotEpsilon?: number;
};

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

const createDenseAugmentedMatrix = (system: LinearSystem) => {
  const matrix = Array.from({length: system.size}, (_unused, row) => {
    const values = Array(system.size + 1).fill(0) as number[];
    values[system.size] = system.rhs[row];
    return values;
  });

  system.entries.forEach((entry) => {
    matrix[entry.row][entry.column] += entry.value;
  });

  return matrix;
};

export const createDenseLinearSystemSolver = (
  options: DenseLinearSystemSolverOptions = {},
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

      const matrix = createDenseAugmentedMatrix(system);
      const size = system.size;

      for(let pivotColumn = 0; pivotColumn < size; pivotColumn += 1) {
        let pivotRow = pivotColumn;
        let pivotAbs = Math.abs(matrix[pivotRow][pivotColumn]);

        for(let candidateRow = pivotColumn + 1; candidateRow < size; candidateRow += 1) {
          const candidateAbs = Math.abs(matrix[candidateRow][pivotColumn]);
          if(candidateAbs > pivotAbs) {
            pivotRow = candidateRow;
            pivotAbs = candidateAbs;
          }
        }

        if(pivotAbs <= pivotEpsilon) {
          return {
            status: "singular",
            message: `Linear system is singular near column ${pivotColumn}.`,
          };
        }

        if(pivotRow !== pivotColumn) {
          [matrix[pivotColumn], matrix[pivotRow]] = [matrix[pivotRow], matrix[pivotColumn]];
        }

        const pivot = matrix[pivotColumn][pivotColumn];
        for(let row = pivotColumn + 1; row < size; row += 1) {
          const factor = matrix[row][pivotColumn] / pivot;
          if(factor === 0) continue;

          matrix[row][pivotColumn] = 0;
          for(let column = pivotColumn + 1; column <= size; column += 1) {
            matrix[row][column] -= factor * matrix[pivotColumn][column];
          }
        }
      }

      const values = Array(size).fill(0) as number[];
      for(let row = size - 1; row >= 0; row -= 1) {
        let rhs = matrix[row][size];
        for(let column = row + 1; column < size; column += 1) {
          rhs -= matrix[row][column] * values[column];
        }

        const pivot = matrix[row][row];
        if(Math.abs(pivot) <= pivotEpsilon) {
          return {
            status: "singular",
            message: `Linear system is singular near row ${row}.`,
          };
        }

        values[row] = rhs / pivot;
      }

      return {
        status: "ok",
        values,
      };
    },
  };
};

export const denseLinearSystemSolver = createDenseLinearSystemSolver();
