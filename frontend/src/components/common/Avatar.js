import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../theme';

export function Avatar({ uri, name, size = 40 }) {
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const styles = makeStyles(size);

  if (uri) {
    return <Image source={{ uri }} style={styles.image} />;
  }

  return (
    <View style={styles.placeholder}>
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
}

function makeStyles(size) {
  return StyleSheet.create({
    image: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: Colors.surfaceAlt,
    },
    placeholder: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      color: Colors.textOnPrimary,
      fontSize: size * 0.35,
      fontWeight: Typography.fontWeights.bold,
    },
  });
}
