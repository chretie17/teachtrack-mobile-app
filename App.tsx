import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TeacherLogin from './src/screens/LoginScreen'; 
import QRScannerScreen from './src/screens/QRScannerScreen'; 

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="TeacherLogin">
        <Stack.Screen name="TeacherLogin" component={TeacherLogin} options={{ title: 'Login' }} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ title: 'QR Scanner' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
