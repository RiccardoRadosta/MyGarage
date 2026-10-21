import React from 'react';
import { Bike, Car, CarFront, Motorbike, Scooter, Truck, Van } from 'lucide-react-native';
import { VehicleIconId } from '../../types';

type IconComponent = React.ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

export const vehicleIconOptions: { id: VehicleIconId; label: string; Icon: IconComponent }[] = [
  { id: 'carFront', label: 'Auto', Icon: CarFront },
  { id: 'car', label: 'Auto', Icon: Car },
  { id: 'motorbike', label: 'Moto', Icon: Motorbike },
  { id: 'scooter', label: 'Scooter', Icon: Scooter },
  { id: 'truck', label: 'Camion', Icon: Truck },
  { id: 'van', label: 'Furgone', Icon: Van },
];

const iconComponents: Record<VehicleIconId, IconComponent> = {
  carFront: CarFront,
  car: Car,
  motorbike: Motorbike,
  scooter: Scooter,
  truck: Truck,
  van: Van,
};

type VehicleIconViewProps = {
  icon: VehicleIconId;
  size?: number;
  color?: string;
};

export const VehicleIconView: React.FC<VehicleIconViewProps> = ({ icon, size = 22, color }) => {
  const Icon = iconComponents[icon];
  return <Icon size={size} color={color} strokeWidth={1.8} />;
};