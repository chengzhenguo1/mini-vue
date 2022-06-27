import { isFunction } from "../shared";

// 防止多次创建Promise
let isFlushPending: boolean = false
let jobs: Function[] = []
const p = Promise.resolve();

export function nextTick(fn) {
  return fn ? p.then(fn) : p
}

export function queueJobs(job: Function) {
  if (!jobs.includes(job)) {
    jobs.push(job)
  }

  queueFlush()
}

function queueFlush() {
  if (isFlushPending) return

  isFlushPending = true

  // 推到异步任务队列中执行
  nextTick(flushJobs)
}

function flushJobs() {
  isFlushPending = false
  let job: Function | undefined;
  while ((job = jobs.shift())) {
    isFunction(job) && job()
  }
}