export interface SensorType {
  type: string;
  xLabel: string;
  yLabel: string;
}

export const SENSOR_TYPES: {[key: string]: SensorType}  = {
tempSensor: {type: 'tempSensor', xLabel: 'Time', yLabel: 'Temperature [°C]'},
humiditySensor: {type: 'humiditySensor', xLabel: 'Time', yLabel: 'Relative humidity [%]'},
luxSensor: {type: 'luxSensor', xLabel: 'Time', yLabel: 'Light intensity [lx]'}
};

