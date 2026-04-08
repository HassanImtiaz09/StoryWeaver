import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Circle, Defs, RadialGradient as SvgRadialGradient, Path, Ellipse } from 'react-native-svg';

// Gradient overlays per theme for text readability
const THEME_GRADIENTS: Record<string, string[]> = {
  space: ['rgba(26,5,51,0.7)', 'rgba(13,27,42,0.85)', 'rgba(10,14,26,0.95)'],
  ocean: ['rgba(10,61,98,0.7)', 'rgba(15,40,70,0.85)', 'rgba(10,14,26,0.95)'],
  forest: ['rgba(11,61,11,0.7)', 'rgba(15,30,15,0.85)', 'rgba(10,14,26,0.95)'],
  dinosaur: ['rgba(139,69,19,0.6)', 'rgba(80,40,10,0.8)', 'rgba(10,14,26,0.95)'],
  pirate: ['rgba(26,26,46,0.7)', 'rgba(20,20,35,0.85)', 'rgba(10,14,26,0.95)'],
  fairy: ['rgba(155,89,182,0.6)', 'rgba(100,50,120,0.8)', 'rgba(10,14,26,0.95)'],
  safari: ['rgba(243,156,18,0.5)', 'rgba(120,70,10,0.8)', 'rgba(10,14,26,0.95)'],
  arctic: ['rgba(34,49,63,0.6)', 'rgba(20,35,50,0.8)', 'rgba(10,14,26,0.95)'],
  candy: ['rgba(108,92,231,0.6)', 'rgba(70,50,150,0.8)', 'rgba(10,14,26,0.95)'],
  garden: ['rgba(39,174,96,0.5)', 'rgba(20,80,40,0.8)', 'rgba(10,14,26,0.95)'],
  robot: ['rgba(40,40,40,0.7)', 'rgba(25,25,35,0.85)', 'rgba(10,14,26,0.95)'],
  medieval: ['rgba(101,67,33,0.6)', 'rgba(60,40,20,0.8)', 'rgba(10,14,26,0.95)'],
  jungle: ['rgba(34,102,34,0.6)', 'rgba(20,60,20,0.8)', 'rgba(10,14,26,0.95)'],
  musical: ['rgba(138,43,226,0.6)', 'rgba(75,30,130,0.8)', 'rgba(10,14,26,0.95)'],
  default: ['rgba(10,14,26,0.3)', 'rgba(10,14,26,0.7)', 'rgba(10,14,26,0.95)'],
};

interface ThemeBackgroundProps {
  theme?: string;
  children: React.ReactNode;
  intensity?: 'light' | 'medium' | 'heavy';
  style?: any;
}

// SVG background components for each theme
function SpaceBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <SvgRadialGradient id="space-star" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </SvgRadialGradient>
      </Defs>
      <Rect width="400" height="800" fill="#0d0a1a" />
      <Circle cx="80" cy="120" r="2" fill="white" opacity="0.9" />
      <Circle cx="320" cy="150" r="1.5" fill="white" opacity="0.8" />
      <Circle cx="200" cy="200" r="2.5" fill="white" opacity="0.95" />
      <Circle cx="350" cy="300" r="1" fill="white" opacity="0.7" />
      <Circle cx="50" cy="400" r="2" fill="white" opacity="0.85" />
      <Circle cx="380" cy="500" r="1.5" fill="white" opacity="0.8" />
      <Circle cx="150" cy="600" r="2" fill="white" opacity="0.9" />
      <Circle cx="300" cy="700" r="1" fill="white" opacity="0.7" />
      <Ellipse cx="200" cy="400" rx="150" ry="200" fill="#1a2847" opacity="0.3" />
    </Svg>
  );
}

function OceanBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#0a3d62" />
      <Path d="M0,400 Q100,380 200,400 T400,400 L400,800 L0,800 Z" fill="#0f4c6b" opacity="0.6" />
      <Path d="M0,550 Q100,530 200,550 T400,550 L400,800 L0,800 Z" fill="#0a2647" opacity="0.8" />
      <Circle cx="100" cy="300" r="30" fill="#4da6ff" opacity="0.2" />
      <Circle cx="300" cy="250" r="25" fill="#4da6ff" opacity="0.15" />
    </Svg>
  );
}

function ForestBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#0b3d0b" />
      <Ellipse cx="100" cy="600" rx="80" ry="200" fill="#1a5c1a" opacity="0.7" />
      <Ellipse cx="300" cy="650" rx="90" ry="180" fill="#1a5c1a" opacity="0.6" />
      <Ellipse cx="200" cy="700" rx="100" ry="150" fill="#0d4d0d" opacity="0.8" />
      <Path d="M50,400 L100,300 L150,400 Z" fill="#2d6b2d" opacity="0.5" />
      <Path d="M280,450 L330,350 L380,450 Z" fill="#2d6b2d" opacity="0.5" />
    </Svg>
  );
}

function DinosaurBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#8b4513" />
      <Ellipse cx="200" cy="700" rx="150" ry="100" fill="#6b3410" opacity="0.5" />
      <Path d="M0,500 Q50,480 100,500 T200,500 T300,500 T400,500 L400,800 L0,800 Z" fill="#5a2d0c" opacity="0.7" />
      <Circle cx="100" cy="300" r="40" fill="#9d6b3d" opacity="0.3" />
      <Circle cx="300" cy="250" r="35" fill="#9d6b3d" opacity="0.25" />
    </Svg>
  );
}

function PirateBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#1a1a2e" />
      <Path d="M0,300 Q100,280 200,300 T400,300 L400,800 L0,800 Z" fill="#4a4a6e" opacity="0.5" />
      <Circle cx="80" cy="200" r="50" fill="#f4d03f" opacity="0.1" />
      <Path d="M100,150 L150,200 L200,150 Z" fill="#8b5a3c" opacity="0.3" />
    </Svg>
  );
}

function FairyBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#4a2454" />
      <Circle cx="80" cy="150" r="60" fill="#d999ff" opacity="0.2" />
      <Circle cx="320" cy="200" r="50" fill="#c96dff" opacity="0.25" />
      <Path d="M0,600 Q100,580 200,600 T400,600 L400,800 L0,800 Z" fill="#6b3d7d" opacity="0.6" />
      <Ellipse cx="200" cy="400" rx="80" ry="60" fill="#7d4d9e" opacity="0.3" />
    </Svg>
  );
}

function SafariBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#d4a574" />
      <Path d="M0,500 Q100,480 200,500 T400,500 L400,800 L0,800 Z" fill="#9d6b3d" opacity="0.6" />
      <Ellipse cx="150" cy="300" rx="100" ry="80" fill="#b8860b" opacity="0.3" />
      <Circle cx="300" cy="350" r="45" fill="#a0522d" opacity="0.4" />
    </Svg>
  );
}

function ArcticBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#d0f0f0" />
      <Path d="M0,600 Q100,580 200,600 T400,600 L400,800 L0,800 Z" fill="#98d8e8" opacity="0.7" />
      <Ellipse cx="100" cy="400" rx="90" ry="70" fill="#87ceeb" opacity="0.3" />
      <Ellipse cx="300" cy="450" rx="85" ry="65" fill="#87ceeb" opacity="0.35" />
    </Svg>
  );
}

function CandyBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#6c5ce7" />
      <Circle cx="100" cy="200" r="50" fill="#ff6b9d" opacity="0.2" />
      <Circle cx="300" cy="150" r="45" fill="#ffa502" opacity="0.2" />
      <Circle cx="150" cy="500" r="55" fill="#74b9ff" opacity="0.2" />
      <Circle cx="280" cy="600" r="50" fill="#55efc4" opacity="0.2" />
    </Svg>
  );
}

function GardenBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#27ae60" />
      <Path d="M0,500 Q100,480 200,500 T400,500 L400,800 L0,800 Z" fill="#1e8449" opacity="0.6" />
      <Circle cx="80" cy="300" r="35" fill="#82e0aa" opacity="0.3" />
      <Circle cx="300" cy="250" r="40" fill="#82e0aa" opacity="0.35" />
      <Path d="M150,400 L160,350 L170,400 Z" fill="#76d7c4" opacity="0.4" />
    </Svg>
  );
}

function RobotBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#282828" />
      <Rect x="50" y="200" width="80" height="80" fill="#4a4a4a" opacity="0.5" />
      <Rect x="280" y="250" width="70" height="70" fill="#4a4a4a" opacity="0.4" />
      <Path d="M0,500 L400,500 L400,800 L0,800 Z" fill="#1a1a1a" opacity="0.7" />
    </Svg>
  );
}

function MedievalBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#654321" />
      <Path d="M50,300 L100,250 L150,300 Z" fill="#8b5a3c" opacity="0.5" />
      <Path d="M280,350 L330,300 L380,350 Z" fill="#8b5a3c" opacity="0.5" />
      <Path d="M0,500 Q100,480 200,500 T400,500 L400,800 L0,800 Z" fill="#3c2415" opacity="0.8" />
    </Svg>
  );
}

function JungleBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#226622" />
      <Ellipse cx="100" cy="400" rx="80" ry="150" fill="#1a5c1a" opacity="0.6" />
      <Ellipse cx="300" cy="450" rx="90" ry="140" fill="#1a5c1a" opacity="0.5" />
      <Path d="M0,600 Q50,590 100,600 T200,600 T300,600 T400,600 L400,800 L0,800 Z" fill="#0d4d0d" opacity="0.9" />
    </Svg>
  );
}

function MusicalBackground() {
  return (
    <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
      <Rect width="400" height="800" fill="#8a2be2" />
      <Circle cx="100" cy="200" r="40" fill="#dda0dd" opacity="0.2" />
      <Circle cx="300" cy="150" r="45" fill="#ba55d3" opacity="0.25" />
      <Path d="M0,500 Q100,480 200,500 T400,500 L400,800 L0,800 Z" fill="#4b0082" opacity="0.7" />
    </Svg>
  );
}

// Map theme names to background components
const THEME_BACKGROUNDS: Record<string, React.FC> = {
  space: SpaceBackground,
  ocean: OceanBackground,
  forest: ForestBackground,
  dinosaur: DinosaurBackground,
  pirate: PirateBackground,
  fairy: FairyBackground,
  safari: SafariBackground,
  arctic: ArcticBackground,
  candy: CandyBackground,
  garden: GardenBackground,
  robot: RobotBackground,
  medieval: MedievalBackground,
  jungle: JungleBackground,
  musical: MusicalBackground,
};

export function ThemeBackground({
  theme,
  children,
  intensity = 'medium',
  style,
}: ThemeBackgroundProps) {
  const BackgroundComponent = theme && THEME_BACKGROUNDS[theme] ? THEME_BACKGROUNDS[theme] : null;
  const gradient = THEME_GRADIENTS[theme || 'default'] || THEME_GRADIENTS.default;

  // Adjust gradient opacity based on intensity
  let adjustedGradient = gradient;
  if (intensity === 'light') {
    adjustedGradient = gradient.map(color =>
      color.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, (match, r, g, b, a) => {
        const newAlpha = Math.max(0, parseFloat(a) - 0.3);
        return `rgba(${r},${g},${b},${newAlpha})`;
      })
    );
  } else if (intensity === 'heavy') {
    adjustedGradient = gradient.map(color =>
      color.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/, (match, r, g, b, a) => {
        const newAlpha = Math.min(1, parseFloat(a) + 0.15);
        return `rgba(${r},${g},${b},${newAlpha})`;
      })
    );
  }

  return (
    <View style={[styles.container, style]}>
      {BackgroundComponent && <BackgroundComponent />}
      <LinearGradient
        colors={adjustedGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

export function getThemeBackground(theme: string): React.FC<ThemeBackgroundProps> {
  return (props) => <ThemeBackground {...props} theme={theme} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
});
