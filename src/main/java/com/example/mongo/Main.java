package com.example.mongo;

import java.awt.image.ImageProducer;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

public class Main {

    public static void main(String[] args) {
        System.out.println(isPalindrome(0));
        System.out.println(Arrays.toString(twoSum(new int[]{2, 4, 9}, 11)));
    }


    public static boolean isPalindrome(int x) {

        char[] cA = String.valueOf(x).toCharArray();
        if(cA.length ==1){
            return true;
        }
        var leng = cA.length-1;
        for (int i = 0; i <cA.length/2; i++) {
            if (cA[i] != cA[leng]){
                return false;
            }
            leng = leng-1;
        }
        return true;
    }



//    Input: nums = [2,7,11,15], target = 9
//    Output: [0,1]
//    Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
//    Example 2:
//
//    Input: nums = [3,2,4], target = 6
//    Output: [1,2]
//    Example 3:
//
//    Input: nums = [3,3], target = 6
//    Output: [0,1]


    public static int[] twoSum(int[] ints, int target){

        Map<Integer,Integer> lookUp = new HashMap<>();

        for (int i = 0; i<ints.length; i++){
            int compliment = target - ints[i];

            if (lookUp.containsKey(compliment)){
                return new int []{ lookUp.get(compliment), i };
            }
            lookUp.put(ints[i], i);
        }
        return null;
    }
}

