import React from 'react';
import {View,Text,Image,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import type { Product } from '../api/products';

const PRIMARY = '#3B82F6';

type Props = {
  item: Product;
  onEdit: (p: Product) => void;
  onDelete: (id: Product['id']) => void;
  /** НЕОБЯЗАТЕЛЬНО: URI локального изображения (file://...), если есть. 
   * Если передано — используется вместо item.photo_url. */
  imageUri?: string;
};

export default function ProductCard({ item, onEdit, onDelete, imageUri }: Props) {
  const daysLeft = (() => {
    const today = new Date();
    const exp = new Date(item.expiry_date + 'T00:00:00');
    return Math.ceil((+exp - +today) / (1000 * 60 * 60 * 24));
  })();

  const isExpired = daysLeft <= 0;
  const warn = daysLeft > 0 && daysLeft <= 3;

  const previewUri = imageUri || item.photo_url || null;

  // рендерим кнопки при свайпе
  const renderRightActions = () => (
    <View style={styles.actions}>
      <TouchableOpacity
        style={[styles.actionBtn, styles.editBtn]}
        onPress={() => onEdit(item)}
      >
        <Text style={styles.actionText}>Изменить</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionBtn, styles.deleteBtn]}
        onPress={() => onDelete(item.id)}
      >
        <Text style={styles.actionText}>Удалить</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.card}>
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={styles.thumb}
            accessibilityLabel={`Изображение: ${item.name}`}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}

        <View style={styles.content}>
          <View style={styles.rowBetween}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View
              style={[
                styles.badge,
                isExpired
                  ? styles.badgeDanger
                  : warn
                  ? styles.badgeWarn
                  : styles.badgeOk,
              ]}
            >
              <Text style={styles.badgeText}>
                {isExpired
                  ? 'просрочен'
                  : warn
                  ? `≤ ${daysLeft} дн.`
                  : `${daysLeft} дн.`}
              </Text>
            </View>
          </View>

          {!!item.category && (
            <Text style={styles.category}>{item.category}</Text>
          )}
          <Text style={styles.meta}>
            Годен до:{' '}
            <Text style={styles.metaStrong}>
              {new Date(item.expiry_date).toLocaleDateString()}
            </Text>
          </Text>
          
          <Text style={styles.meta}>Количество: {item.quantity} г</Text>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  thumbPlaceholder: { backgroundColor: '#eef2f7' },
  content: { flex: 1, gap: 4 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0f172a',
    flexShrink: 1,
  },
  category: { color: '#6b7280' },
  meta: { color: '#111827' },
  metaStrong: { fontWeight: '700' },
  metaDim: { color: '#6b7280' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: 'white', fontWeight: '800', fontSize: 12 },
  badgeOk: { backgroundColor: '#10B981' },
  badgeWarn: { backgroundColor: '#F59E0B' },
  badgeDanger: { backgroundColor: '#EF4444' },

  // swipe actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
  },
  editBtn: { backgroundColor: PRIMARY },
  deleteBtn: { backgroundColor: '#DC2626' },
  actionText: { color: 'white', fontWeight: '700' },
});
