import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_CONFIG } from './config'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage


export default function TeacherLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);

    const credentials = { identifier, password };

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.role === 'teacher') {
          // Store the token, role, and id in AsyncStorage
          await AsyncStorage.setItem('teacher_token', data.token);
          await AsyncStorage.setItem('teacher_id', data.id.toString()); // Convert id to string for AsyncStorage
          await AsyncStorage.setItem('teacher_role', data.role);

          Alert.alert('Success', 'Login successful');
          navigation.navigate('QRScanner');
        } else {
          Alert.alert('Error', 'This login is for teachers only.');
        }
      } else {
        Alert.alert('Error', data.error || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during login.');
      console.error('Error during login:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ImageBackground
      source={require('../../assets/background.jpg')} // Make sure to add a suitable background image
      style={styles.backgroundImage}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <LinearGradient
          colors={['rgba(0,68,123,0.8)', 'rgba(0,68,123,0.6)']}
          style={styles.gradient}
        >
          <View style={styles.loginContainer}>
            <Text style={styles.title}>Teacher Login</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={24} color="#00447B" style={styles.icon} />
              <TextInput
                placeholder="Username"
                placeholderTextColor="#6B98B8"
                value={identifier}
                onChangeText={setIdentifier}
                style={styles.input}
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={24} color="#00447B" style={styles.icon} />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#6B98B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginContainer: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00447B',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#00447B',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    color: '#00447B',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#00447B',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});