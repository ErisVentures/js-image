export type FlatMatrix = number[]
export type DeepMatrix = number[][]
export type Matrix = FlatMatrix|DeepMatrix

function isDeepMatrix(matrix: Matrix): matrix is DeepMatrix {
  return Array.isArray(matrix[0])
}

export function ensureFlatMatrix(matrix: Matrix): FlatMatrix {
  if (!matrix.length) {
    throw new Error('Matrix must have length')
  }

  let flatMatrix: FlatMatrix = matrix as FlatMatrix
  if (isDeepMatrix(matrix)) {
    flatMatrix = matrix.reduce((acc: any, arr: any) => acc.concat(arr), [])
  }

  const matrixSize = Math.sqrt(flatMatrix.length)
  if (matrixSize !== Math.round(matrixSize)) {
    throw new Error('Matrix must be square')
  }

  return flatMatrix
}
