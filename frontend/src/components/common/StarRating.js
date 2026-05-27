import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../theme';

export function StarRating({ rating = 0, size = 16, onRate, showCount, count }) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.container}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          onPress={onRate ? () => onRate(star) : undefined}
          disabled={!onRate}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.star, { fontSize: size }]}>
            {star <= Math.round(rating) ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
      {showCount && (
        <Text style={styles.count}>
          {Number(rating).toFixed(1)} {count != null ? `(${count})` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    color: Colors.star,
    marginRight: 2,
    lineHeight: undefined,
  },
  count: {
    marginLeft: 6,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
});
