import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from './config'; 
import AsyncStorage from '@react-native-async-storage/async-storage';


// Kigali's approximate latitude and longitude
const KIGALI_LATITUDE = -1.94407;
const KIGALI_LONGITUDE = 30.061885;
const KIGALI_RADIUS = 20000; // 20 km radius

const { width } = Dimensions.get('window');

export default function QRScannerScreen() {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await BarCodeScanner.requestPermissionsAsync();
      setHasCameraPermission(cameraStatus === 'granted');

      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        setHasLocationPermission(true);
      } else {
        Alert.alert('Error', 'Location permission is required.');
        setHasLocationPermission(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!scanned) {
      Animated.loop(
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [scanned]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // distance in meters
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setIsLoading(true);
  
    try {
      console.log('Scanned data:', data);
  
      if (typeof data !== 'string' || data.length === 0) {
        throw new Error('QR code data is not valid.');
      }
  
      const qrIdentifier = data;
      console.log('Parsed QR Identifier:', qrIdentifier);
  
      // Retrieve the logged-in teacher's ID from AsyncStorage
      const loggedInTeacherId = await AsyncStorage.getItem('teacher_id');
      if (!loggedInTeacherId) {
        throw new Error('Teacher ID not found. Please login again.');
      }
  
      console.log('Logged-in Teacher ID:', loggedInTeacherId);
  
      const distance = calculateDistance(
        location?.coords.latitude,
        location?.coords.longitude,
        KIGALI_LATITUDE,
        KIGALI_LONGITUDE
      );
      console.log('Distance from Kigali:', distance);
  
      if (distance > KIGALI_RADIUS) {
        Alert.alert('Location Error', 'You must be within the Kigali area to mark attendance.');
        setIsLoading(false);
        return;
      }
  
      // Send the scanned QR identifier to the backend and validate the teacher
      const response = await fetch(`${API_CONFIG.BASE_URL}/attendance/mark-qr-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: qrIdentifier,
          teacher_id: loggedInTeacherId, // Send the logged-in teacher's ID for comparison
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
        }),
      });
  
      const responseData = await response.json();
      console.log('API response:', responseData);
  
      if (response.ok) {
        if (responseData.error) {
          if (responseData.error === 'Attendance already recorded for this class.') {
            Alert.alert('Duplicate Entry', 'Attendance has already been recorded for this class.');
          } else if (responseData.error.includes('Attendance can only be marked between')) {
            Alert.alert('Class Time Error', responseData.error);
          } else if (responseData.error === 'Teacher mismatch') {
            Alert.alert('Error', 'You are not the same person as the teacher associated with this class.');
          }
        } else {
          Alert.alert('Success', 'Attendance marked successfully!');
        }
      } else {
        Alert.alert('Error', responseData.error || 'Failed to mark attendance.');
      }
    } catch (error) {
      console.error('Error during QR scan or API call:', error);
      Alert.alert('Error', 'Invalid QR code data or attendance marking failed.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (hasCameraPermission === null || hasLocationPermission === null) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Requesting permissions...</Text>
      </SafeAreaView>
    );
  }

  if (!hasCameraPermission || !hasLocationPermission) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="alert-circle-outline" size={64} color="#FFFFFF" />
        <Text style={styles.errorText}>
          {!hasCameraPermission ? 'No access to camera' : 'No access to location'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['rgba(0,68,123,0.8)', 'rgba(0,68,123,0.6)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.scannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer} />
          <View style={styles.focusedContainer}>
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 220],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.cornerTL,
                styles.corner,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Animated.View
              style={[
                styles.cornerTR,
                styles.corner,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Animated.View
              style={[
                styles.cornerBL,
                styles.corner,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Animated.View
              style={[
                styles.cornerBR,
                styles.corner,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
          </View>
          <View style={styles.unfocusedContainer} />
        </View>
      </View>
      {scanned && (
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setScanned(false)}
          disabled={isLoading}
        >
          <Text style={styles.scanButtonText}>
            {isLoading ? 'Processing...' : 'Tap to Scan Again'}
          </Text>
        </TouchableOpacity>
      )}
      <Text style={styles.instructionText}>
        Align the QR code within the frame to scan
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00447B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00447B',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00447B',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  unfocusedContainer: {
    flex: 1,
  },
  focusedContainer: {
    height: 230,
    width: 230,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLine: {
    position: 'absolute',
    width: 220,
    height: 2,
    backgroundColor: '#00BFFF',
  },
  scanButton: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 25,
    margin: 20,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#00447B',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
  },
});