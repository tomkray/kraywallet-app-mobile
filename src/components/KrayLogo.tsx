/**
 * KRAY Logo Component
 * The official KRAY triangle/diamond logo
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { G, Path, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';
import colors from '../theme/colors';

interface KrayLogoProps {
  size?: number;
  color?: string;
  backgroundColor?: string;
  showBackground?: boolean;
  glow?: boolean;
}

export function KrayLogo({
  size = 100,
  color = colors.black,
  backgroundColor = colors.primary,
  showBackground = true,
  glow = false
}: KrayLogoProps) {
  const svgSize = size * 0.55;
  const aspectRatio = 1018.3 / 1062.92;

  const logoSvg = (
    <Svg
      width={svgSize}
      height={svgSize * aspectRatio}
      viewBox="0 0 1062.92 1018.3"
    >
      {glow && (
        <Defs>
          <Filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur stdDeviation="15" result="coloredBlur" />
            <FeMerge>
              <FeMergeNode in="coloredBlur" />
              <FeMergeNode in="SourceGraphic" />
            </FeMerge>
          </Filter>
        </Defs>
      )}
      <G filter={glow ? "url(#glow)" : undefined}>
        <Path
          d="M705.86,498.14,1062.92,0,560.56,49l-29.1-8.1L502.36,49,0,0,357.06,498.14l174.4,520.16ZM1000,36.28,738.29,401.39l92.9-277.07-190.43-53ZM531.46,82l26.45-2.58L792.7,144.75,678.85,484.33,531.46,690,384.07,484.33,270.21,144.75,505,79.41ZM62.92,36.28,422.15,71.33l-190.43,53,92.9,277.07ZM531.46,741.45,646.41,581.08,531.46,923.93l-115-342.85Z"
          fill={color}
        />
      </G>
    </Svg>
  );

  if (!showBackground) {
    return (
      <View style={glow ? styles.glowWrapper : undefined}>
        {logoSvg}
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      {
        width: size,
        height: size,
        backgroundColor,
        borderRadius: size * 0.22,
      }
    ]}>
      {logoSvg}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
      web: {
        // @ts-ignore
        filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))',
      },
    }),
  },
});

export default KrayLogo;
