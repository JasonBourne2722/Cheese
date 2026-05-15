export class Checkpoints {
  constructor(track) {
    this.track = track;
  }

  update(vehicle) {
    const checkpoint = this.track.nextCheckpoint(vehicle.progress);
    if (checkpoint && checkpoint.progress >= vehicle.lastCheckpoint) {
      vehicle.lastCheckpoint = checkpoint.progress;
    }
    if (vehicle.crashed) {
      vehicle.crashed = false;
      vehicle.reset(vehicle.lastCheckpoint, vehicle.name === 'ETH' ? -3 : 3);
      return true;
    }
    return false;
  }
}
