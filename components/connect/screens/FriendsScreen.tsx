import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View, TouchableOpacity, ScrollView } from 'react-native';
import { FriendCard } from '@/components/connect/FriendCard';
import { AppText as Text } from '@/components/ui/AppText';
import { useFriends } from '@/hooks/connect/useFriends';
import { useTheme } from '@/lib/ThemeContext';
import { Compass, Mail, Search, Users } from 'lucide-react-native';

export default function FriendsScreen() {
  const { theme, isDark } = useTheme();
  const {
    friends,
    incomingRequests,
    sentRequests,
    searchResults,
    searchQuery,
    setSearchQuery,
    isSearching,
    loading,
    refresh,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    removeFriend,
  } = useFriends();

  const [activeSegment, setActiveSegment] = useState<'friends' | 'requests'>('friends');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const isSearchActive = searchQuery.trim().length >= 2;

  // Render main lists header (only when searching or showing friends)
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {isSearchActive ? (
        <View style={styles.sectionHeaderRow}>
          <Compass size={16} color={theme.accent} />
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
            Search Results for "{searchQuery.trim()}"
          </Text>
        </View>
      ) : (
        <View style={styles.sectionHeaderRow}>
          <Users size={16} color={theme.accent} />
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
            My Friends ({friends.length})
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading || isSearching) return null;

    if (isSearchActive) {
      return (
        <View style={styles.emptyBox}>
          <Compass size={40} color={theme.secondaryText} style={styles.emptyIcon} />
          <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No users found</Text>
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            We couldn't find any users matching "{searchQuery.trim()}". Make sure the spelling is correct.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyBox}>
        <Users size={40} color={theme.secondaryText} style={styles.emptyIcon} />
        <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>Build your squad</Text>
        <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
          You haven't added any friends yet. Search for usernames above to connect, build consistency, and stay accountable together.
        </Text>
      </View>
    );
  };

  const renderRequests = () => {
    const hasIncoming = incomingRequests.length > 0;
    const hasSent = sentRequests.length > 0;

    if (!hasIncoming && !hasSent) {
      return (
        <View style={styles.emptyBox}>
          <Mail size={40} color={theme.secondaryText} style={styles.emptyIcon} />
          <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No pending requests</Text>
          <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
            When someone adds you as a friend, their request will appear here for you to accept or decline.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView 
        contentContainerStyle={styles.listContent} 
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Incoming Requests */}
        {hasIncoming && (
          <View style={styles.requestsSubSection}>
            <Text style={[styles.subSectionTitle, { color: theme.secondaryText }]}>INCOMING ({incomingRequests.length})</Text>
            {incomingRequests.map(item => (
              <FriendCard
                key={item.user_id}
                user={item}
                onAcceptRequest={acceptFriendRequest}
                onDeclineRequest={declineFriendRequest}
              />
            ))}
          </View>
        )}

        {/* Sent Requests */}
        {hasSent && (
          <View style={styles.requestsSubSection}>
            <Text style={[styles.subSectionTitle, { color: theme.secondaryText }]}>PENDING SENT ({sentRequests.length})</Text>
            {sentRequests.map(item => (
              <FriendCard
                key={item.user_id}
                user={item}
                onCancelRequest={cancelFriendRequest}
              />
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const listData = isSearchActive ? searchResults : friends;

  return (
    <View style={styles.container}>
      {/* Segment Selector */}
      <View style={[styles.segmentContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
        <TouchableOpacity 
          style={[styles.segmentBtn, activeSegment === 'friends' && (isDark ? styles.segmentBtnActiveDark : styles.segmentBtnActiveLight)]}
          onPress={() => setActiveSegment('friends')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeSegment === 'friends' ? { color: theme.accent } : { color: theme.secondaryText }]}>
            All Friends ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.segmentBtn, activeSegment === 'requests' && (isDark ? styles.segmentBtnActiveDark : styles.segmentBtnActiveLight)]}
          onPress={() => setActiveSegment('requests')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.segmentText, activeSegment === 'requests' ? { color: theme.accent } : { color: theme.secondaryText }]}>
              Requests
            </Text>
            {incomingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{incomingRequests.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {activeSegment === 'friends' ? (
        <>
          <View style={styles.searchContainer}>
            <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <Search size={18} color={theme.secondaryText} style={styles.searchIcon} />
              <TextInput
                style={[styles.input, { color: theme.primaryText }]}
                placeholder="Search users by username..."
                placeholderTextColor={theme.secondaryText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isSearching && <ActivityIndicator size="small" color={theme.accent} style={{ marginLeft: 8 }} />}
            </View>
          </View>

          <FlatList
            data={listData}
            keyExtractor={item => item.user_id}
            renderItem={({ item }) => (
              <FriendCard
                user={item}
                onSendRequest={sendFriendRequest}
                onAcceptRequest={acceptFriendRequest}
                onDeclineRequest={declineFriendRequest}
                onCancelRequest={cancelFriendRequest}
                onRemoveFriend={removeFriend}
              />
            )}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          />
        </>
      ) : (
        renderRequests()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentBtnActiveLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  segmentBtnActiveDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  segmentText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter_800ExtraBold',
  },
  headerContainer: {
    marginBottom: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    padding: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.2,
  },
  requestsSubSection: {
    marginBottom: 20,
    paddingLeft: 4,
  },
  subSectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  emptyBox: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    marginBottom: 14,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
});
