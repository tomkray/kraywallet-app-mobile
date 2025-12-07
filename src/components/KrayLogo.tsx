/**
 * Kray Logo Component
 * SVG logo for KRAY OS / KrayWallet
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

interface KrayLogoProps {
  size?: number;
  color?: string;
  backgroundColor?: string;
  showBackground?: boolean;
}

export function KrayLogo({ 
  size = 80, 
  color = '#FFFFFF',
  backgroundColor = '#000000',
  showBackground = true 
}: KrayLogoProps) {
  // Aspect ratio from original SVG (1018.3 / 1062.92)
  const aspectRatio = 1018.3 / 1062.92;
  const svgSize = size * 0.6; // Logo occupies 60% of container
  const svgHeight = svgSize * aspectRatio;

  const logo = (
    <Svg
      width={svgSize}
      height={svgHeight}
      viewBox="0 0 1062.92 1018.3"
    >
      <G>
        <Path
          d="M705.86,498.14,1062.92,0,560.56,49l-29.1-8.1L502.36,49,0,0,357.06,498.14l174.4,520.16ZM1000,36.28,738.29,401.39l92.9-277.07-190.43-53ZM531.46,82l26.45-2.58L792.7,144.75,678.85,484.33,531.46,690,384.07,484.33,270.21,144.75,505,79.41ZM62.92,36.28,422.15,71.33l-190.43,53,92.9,277.07ZM531.46,741.45,646.41,581.08,531.46,923.93l-115-342.85Z"
          fill={color}
        />
      </G>
    </Svg>
  );

  if (!showBackground) {
    return logo;
  }

  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        backgroundColor,
        borderRadius: size * 0.2, // 20% border radius like app icon
      }
    ]}>
      {logo}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
});

export default KrayLogo;

