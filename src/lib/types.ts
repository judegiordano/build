export interface MessagePayload {
  project: ProjectPayload
  deployment: DeploymentPayload
  git: GitPayload
  build: BuildPayload
  output: OutputPayload
  finally: FinallyPayload
}

export interface ProjectPayload {
  id: string
}

export interface DeploymentPayload {
  id: string
}

export interface GitPayload {
  url: string
  ref: string
  commit: string
  username: string
  password: string
}

export interface BuildPayload {
  targetName: string
  configuration: 'debug' | 'release'
}

export interface OutputPayload {
  bucket: string
  key: string
}

export interface FinallyPayload {
  queueUrl: string
  body?: Record<string, unknown>
}
