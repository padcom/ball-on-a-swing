#!/usr/bin/env node

const Controller = require('node-pid-controller')

/**
 * Class representing the swing on which the ball will be moving
 */
class Swing {
  /**
   * @param angle initial angle of the swing
   * @param length length of the swing (left and right side combined)
   * @param maxAngle max angle the swing can be tilted left or right before it hits the bottom (in radians)
   * @param maxDelta max difference of angle when it is tilted (in radians)
   */
  constructor(angle = 0, length = 200, maxAngle = Math.PI/4, maxDelta = Math.PI/36) {
    this.angle = angle
    this.minAngle = -maxAngle
    this.maxAngle = maxAngle
    this.minDelta = -(maxDelta/2)
    this.maxDelta = maxDelta/2
    this.length = length
  }

  /**
   * @param delta delta (in radians)
   */
  tilt(delta) {
    delta = delta > this.maxDelta ? this.maxDelta : delta
    delta = delta < this.minDelta ? this.minDelta : delta

    this.angle += delta

    this.angle = this.angle > this.maxAngle ? this.angle = this.maxAngle : this.angle
    this.angle = this.angle < this.minAngle ? this.angle = this.minAngle : this.angle
  }
}

/**
 * Class representing the ball on the swing
 */
class Ball {
  /**
   * @param swing swing to ride on
   * @param position initial position on the swing
   * @param size size of the ball
   * @param mass mass of the ball
   */
  constructor(swing, position = 0, size = 10, mass = 10) {
    this.swing = swing
    this.position = position
    this.size = size
    this.mass = mass
    this.speed = 0
  }

  /**
   * @param dt delta time (default: 1)
   */
  calculateSpeedAndPosition(dt = 1) {
    const F = this.mass * 9.81 * Math.sin(this.swing.angle)
    const a = F / this.mass
    const distance = (a * dt**2) / 2
    this.position = this.position + distance
    if (Math.abs(this.position) > this.swing.length/2 - this.size/2) {
      this.position = this.swing.length/2 - this.size/2 * Math.sign(this.position)
      this.speed = 0
    } else {
      this.speed = distance / dt
    }
  }

  isCentered(sigma = 0.00001) {
    return Math.abs(this.speed) < sigma && Math.abs(this.position) < sigma
  }
}

// ----------------------------------------------------------------------------

function testme(k_p, k_i = 0, k_d = 0) {
  const swing = new Swing()
  const ball = new Ball(swing, 70)

  const ctr = new Controller({ k_p, k_i, k_d, dt: 1, i_max: Math.PI / 4 })
  ctr.setTarget(0)

  let i = 0
  for (let i = 0; i < 10000; i++) {
    ball.calculateSpeedAndPosition(ctr.dt)
    const correction = ctr.update(ball.position)
    // console.log('x:', ball.position, '; V:', ball.speed, '; alpha:', swing.angle * 180 / Math.PI, '; delta:', correction)
    swing.tilt(correction)
    if (ball.isCentered()) return i
  }

  return null
}

// 48 p 0.0124414999999855 i 0 d 0.12500250000000002

function find_d_min(k_p, k_i, min_k_d, max_k_d) {
  // if the given min_k_d works - return it
  if (testme(k_p, k_i, min_k_d) !== null) {
    return min_k_d
  }

  // otherwise find the lowest value that will work
  for (let i = 0; i < 10; i++) {
    const k_d = (max_k_d + min_k_d) / 2
    const result = testme(k_p, k_i, k_d)
    if (result !== null) {
      max_k_d = k_d
    } else {
      min_k_d = k_d
    }
  }

  return max_k_d
}

function find_d_max(k_p, k_i, min_k_d, max_k_d) {
  // if the given min_k_d works - return it
  if (testme(k_p, k_i, max_k_d) !== null) {
    return max_k_d
  }

  // otherwise find the lowest value that will work
  for (let i = 0; i < 10; i++) {
    const k_d = (max_k_d + min_k_d) / 2
    const result = testme(k_p, k_i, k_d)
    if (result !== null) {
      min_k_d = k_d
    } else {
      max_k_d = k_d
    }
  }

  return min_k_d
}

// i: 40 p: 0.020470999999999802 i: 0 d: 0.19824218750000003
// i: 40 p: 0.020470999999932918 i: 0 d: 0.19824218750000003
// i: 102 p: 0.028324499999886277 i: 0.001 d: 0.10009765625000001

function main() {
  let best = Number.POSITIVE_INFINITY
  for (let k_p = 0.001; k_p < 0.035; k_p += 0.0000001) {
    const k_i = 0.01
    let k_d_min = find_d_min(k_p, k_i, 0, 0.2), k_d_max = find_d_max(k_p, k_i, 0.1, 0.5)

    for (let j = 0; j < 10; j++) {
      const k_d = (k_d_max - k_d_min) / 2

      const count_k_d_min = testme(k_p, k_i, k_d_min)
      const count_k_d_max = testme(k_p, k_i, k_d_max)

      if (count_k_d_min < count_k_d_max) {
        k_d_max = k_d
      } else {
        k_d_min = k_d
      }

      const result = testme(k_p, k_i, k_d)
      if (result && result < best) {
        best = result
        console.log('i:', result, 'p:', k_p, 'i:', k_i, 'd:', k_d)
      }
    }
  }
}

main()
